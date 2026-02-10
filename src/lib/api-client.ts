/**
 * API客户端配置
 */

import { refreshAccessToken } from './client-auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// Token刷新锁，防止并发刷新
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

/**
 * 添加刷新订阅者（等待token刷新完成）
 */
function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

/**
 * 通知所有订阅者token已刷新
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

/**
 * 统一的API请求方法
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // 从localStorage获取token
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(url, config)

    // 处理401未授权错误 - 尝试刷新token
    if (response.status === 401 && token) {
      // 如果正在刷新token，加入等待队列
      if (isRefreshing) {
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh((newToken: string) => {
            // 使用新token重试请求
            const retryHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              ...(options.headers as Record<string, string>),
              'Authorization': `Bearer ${newToken}`,
            }

            fetch(url, {
              ...options,
              headers: retryHeaders,
            })
              .then(res => res.json())
              .then(data => {
                if (data.code === 200) {
                  resolve(data)  // 返回完整响应对象，保持一致性
                } else {
                  reject(new Error(data.message || '请求失败'))
                }
              })
              .catch(err => reject(err))
          })
        })
      }

      // 开始刷新token
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()
        isRefreshing = false
        onTokenRefreshed(newToken)

        // 使用新token重试请求
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
          'Authorization': `Bearer ${newToken}`,
        }

        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        })

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({
            message: `HTTP error! status: ${retryResponse.status}`,
          }))
          throw new Error(errorData.message || '请求失败')
        }

        const retryResult = await retryResponse.json()

        // 检查业务状态码，确保请求成功
        if (retryResult.code !== 200) {
          throw new Error(retryResult.message || '请求失败')
        }

        return retryResult
      } catch (refreshError) {
        // 刷新token失败，清除本地存储并跳转登录
        isRefreshing = false
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userInfo')
        document.cookie = 'token=; path=/; max-age=0'

        // 跳转到登录页
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }

        throw new Error('登录已过期，请重新登录')
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }))
      throw new Error(errorData.message || '请求失败')
    }

    return await response.json()
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

/**
 * GET请求
 */
export function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' })
}

/**
 * POST请求
 */
export function post<T>(endpoint: string, data?: any): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT请求
 */
export function put<T>(endpoint: string, data?: any): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE请求
 */
export function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' })
}

/**
 * 文件上传（支持 token 自动刷新）
 */
export async function uploadFile(endpoint: string, file: File): Promise<{ url: string; fileName: string }> {
  const url = `${API_BASE_URL}${endpoint}`

  const uploadWithToken = async (token: string): Promise<Response> => {
    const formData = new FormData()
    formData.append('file', file)

    return fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })
  }

  let token = localStorage.getItem('token')
  if (!token) {
    throw new Error('未登录')
  }

  let response = await uploadWithToken(token)

  // 处理 401 未授权错误 - 尝试刷新 token
  if (response.status === 401) {
    if (isRefreshing) {
      // 如果正在刷新 token，等待刷新完成
      return new Promise<{ url: string; fileName: string }>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken: string) => {
          try {
            const retryResponse = await uploadWithToken(newToken)

            if (!retryResponse.ok) {
              const errorData = await retryResponse.json().catch(() => ({
                message: `HTTP error! status: ${retryResponse.status}`,
              }))
              reject(new Error(errorData.message || '上传失败'))
              return
            }

            const result = await retryResponse.json()
            if (result.code !== 200) {
              reject(new Error(result.message || '上传失败'))
              return
            }

            resolve({
              url: result.data.fileUrl,
              fileName: result.data.fileName,
            })
          } catch (err) {
            reject(err)
          }
        })
      })
    }

    // 开始刷新 token
    isRefreshing = true

    try {
      const newToken = await refreshAccessToken()
      isRefreshing = false
      onTokenRefreshed(newToken)

      // 使用新 token 重试上传
      response = await uploadWithToken(newToken)
    } catch (refreshError) {
      // 刷新 token 失败，清除本地存储并跳转登录
      isRefreshing = false
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userInfo')
      document.cookie = 'token=; path=/; max-age=0'

      // 跳转到登录页
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }

      throw new Error('登录已过期，请重新登录')
    }
  }

  // 检查 HTTP 状态码
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }))
    throw new Error(errorData.message || '上传失败')
  }

  const result = await response.json()

  // 检查业务状态码
  if (result.code !== 200) {
    throw new Error(result.message || '上传失败')
  }

  // 返回文件URL和文件名
  return {
    url: result.data.fileUrl,
    fileName: result.data.fileName,
  }
}
