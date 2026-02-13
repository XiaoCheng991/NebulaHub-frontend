/**
 * 核心 HTTP 客户端（支持双 Token 无感刷新）
 *
 * 特性：
 * - 自动注入 Access Token
 * - 401 错误自动刷新 Token
 * - 并发请求控制
 * - 统一的鉴权拦截
 */

import {
  ApiResponse,
  RequestConfig,
  ApiError,
  RequestMetadata,
} from './types'
import {
  getAccessToken,
  setTokenRefreshFn,
  clearTokens,
  ensureValidAccessToken,
} from '@/lib/auth/dual-token-manager'
import { apiLogger } from '@/lib/utils/logger'
import { handleApiError } from '@/lib/utils/error-handler'

/**
 * API 基础 URL
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * 登录过期的错误消息列表
 */
const LOGIN_EXPIRED_MESSAGES = [
  '登录已过期',
  '登录已过期，请重新登录',
  'token已过期',
  'token无效',
  '未登录',
  '认证失败',
  '请先登录',
]

/**
 * 检查错误消息是否表示登录过期
 */
function isLoginExpiredMessage(message: string): boolean {
  return LOGIN_EXPIRED_MESSAGES.some(msg => message.includes(msg))
}

/**
 * 清除认证信息并跳转到登录页
 */
function handleAuthExpired(): void {
  console.warn('[Auth] 检测到登录过期，开始清理认证信息...')

  // 清除本地存储
  clearTokens()

  if (typeof window !== 'undefined') {
    localStorage.removeItem('userInfo')
    window.dispatchEvent(new Event('auth-change'))
  }

  console.warn('[Auth] 认证信息已清理，即将跳转到登录页')

  // 跳转到登录页
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

/**
 * 设置 Token 刷新函数
 */
export function setupTokenRefresh(refreshFn: (refreshToken: string) => Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>) {
  setTokenRefreshFn(refreshFn)
}

/**
 * 请求拦截器类型
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>

/**
 * 响应拦截器类型
 */
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>

/**
 * 注册的拦截器
 */
const requestInterceptors: RequestInterceptor[] = []
const responseInterceptors: ResponseInterceptor[] = []

/**
 * 添加请求拦截器
 */
export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor)
}

/**
 * 添加响应拦截器
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor)
}

/**
 * 应用请求拦截器
 */
async function applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
  let result = config
  for (const interceptor of requestInterceptors) {
    result = await interceptor(result)
  }
  return result
}

/**
 * 应用响应拦截器
 */
async function applyResponseInterceptors(response: Response): Promise<Response> {
  let result = response
  for (const interceptor of responseInterceptors) {
    result = await interceptor(result)
  }
  return result
}

/**
 * 创建带超时的 fetch
 */
function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId)
  })
}

/**
 * 核心 HTTP 请求方法
 */
async function request<T>(
  endpoint: string,
  options: RequestConfig = {}
): Promise<T> {
  const startTime = Date.now()
  const url = `${API_BASE_URL}${endpoint}`

  // 准备请求配置
  let config: RequestConfig = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  // 自动注入 Token（除非 skipAuth 为 true）
  if (!config.skipAuth) {
    try {
      // 使用 ensureValidAccessToken 确保获取有效的 token
      // 如果 token 已过期，会自动刷新
      const token = await ensureValidAccessToken()
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        }
      }
    } catch (error) {
      // 无法获取有效 token，继续请求（可能返回 401）
      console.warn('[API] 无法获取有效的 Access Token:', error)
    }
  }

  // 应用请求拦截器
  config = await applyRequestInterceptors(config)

  // 记录请求开始
  apiLogger.requestStart(url, config.method || 'GET', config)

  try {
    let response = await fetchWithTimeout(
      url,
      config,
      config.timeout || 30000
    )

    // 应用响应拦截器
    response = await applyResponseInterceptors(response)

    // 处理 401 未授权错误 - 尝试刷新 token
    if (response.status === 401 && !config.skipAuth) {
      console.log('[API] 收到 401 响应，尝试刷新 Token...')

      try {
        // 尝试刷新 token
        const newToken = await ensureValidAccessToken()

        // 使用新 token 重试请求
        const retryConfig: RequestConfig = {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          },
        }

        response = await fetchWithTimeout(
          url,
          retryConfig,
          config.timeout || 30000
        )

        response = await applyResponseInterceptors(response)

        console.log('[API] Token 刷新成功，重试请求')
      } catch (refreshError) {
        // Token 刷新失败
        console.error('[API] Token 刷新失败:', refreshError)

        const metadata: RequestMetadata = {
          url,
          method: config.method || 'GET',
          timestamp: startTime,
          duration: Date.now() - startTime,
          success: false,
          statusCode: 401,
          errorMessage: 'Token refresh failed',
        }

        apiLogger.requestError(metadata)

        // 清除 token 并跳转登录
        handleAuthExpired()

        throw new ApiError('登录已过期，请重新登录', 401, refreshError as Error)
      }
    }

    // 检查 HTTP 状态码
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }))

      const metadata: RequestMetadata = {
        url,
        method: config.method || 'GET',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: false,
        statusCode: response.status,
        errorMessage: errorData.message,
      }

      apiLogger.requestError(metadata)

      const errorMessage = errorData.message || `HTTP error! status: ${response.status}`

      // 检查是否是登录过期相关的错误
      if (isLoginExpiredMessage(errorMessage)) {
        handleAuthExpired()
      }

      throw new ApiError(errorMessage, response.status)
    }

    // 解析响应
    const result = await response.json()

    const metadata: RequestMetadata = {
      url,
      method: config.method || 'GET',
      timestamp: startTime,
      duration: Date.now() - startTime,
      success: true,
      statusCode: response.status,
    }

    apiLogger.requestSuccess(metadata)

    // 检查业务状态码
    if (result.code !== 200) {
      const errorMessage = result.message || '请求失败'

      // 关键：检查是否是登录过期的业务错误
      if (isLoginExpiredMessage(errorMessage)) {
        handleAuthExpired()
      }

      throw new ApiError(errorMessage, result.code)
    }

    return result
  } catch (error) {
    if (error instanceof ApiError) {
      if (!options.skipErrorHandler) {
        handleApiError(error, { url, method: config.method || 'GET' })
      }
      throw error
    }

    // 网络错误或其他错误
    const metadata: RequestMetadata = {
      url,
      method: config.method || 'GET',
      timestamp: startTime,
      duration: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }

    apiLogger.requestError(metadata)

    if (!options.skipErrorHandler) {
      handleApiError(error, { url, method: config.method || 'GET' })
    }

    throw error
  }
}

/**
 * GET 请求
 */
export function get<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: 'GET',
  })
}

/**
 * POST 请求
 */
export function post<T>(
  endpoint: string,
  data?: any,
  config: RequestConfig = {}
): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT 请求
 */
export function put<T>(
  endpoint: string,
  data?: any,
  config: RequestConfig = {}
): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE 请求
 */
export function del<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: 'DELETE',
  })
}

/**
 * PATCH 请求
 */
export function patch<T>(
  endpoint: string,
  data?: any,
  config: RequestConfig = {}
): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * 文件上传
 */
export async function uploadFile(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string; fileName: string }> {
  const startTime = Date.now()
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

  let token = getAccessToken()
  if (!token) {
    throw new ApiError('未登录', 401)
  }

  let response = await uploadWithToken(token)

  // 处理 401 未授权错误 - 尝试刷新 token
  if (response.status === 401) {
    try {
      token = await ensureValidAccessToken()
      response = await uploadWithToken(token)
    } catch (refreshError) {
      // Token 刷新失败
      if (typeof window !== 'undefined') {
        handleAuthExpired()
      }
      throw new ApiError('登录已过期，请重新登录', 401, refreshError as Error)
    }
  }

  // 检查 HTTP 状态码
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }))

    const metadata: RequestMetadata = {
      url,
      method: 'POST',
      timestamp: startTime,
      duration: Date.now() - startTime,
      success: false,
      statusCode: response.status,
      errorMessage: errorData.message,
    }

    apiLogger.requestError(metadata)

    const errorMessage = errorData.message || `HTTP error! status: ${response.status}`

    // 检查是否是登录过期
    if (isLoginExpiredMessage(errorMessage)) {
      handleAuthExpired()
    }

    throw new ApiError(errorMessage, response.status)
  }

  const result = await response.json()

  const metadata: RequestMetadata = {
    url,
    method: 'POST',
    timestamp: startTime,
    duration: Date.now() - startTime,
    success: true,
    statusCode: response.status,
  }

  apiLogger.requestSuccess(metadata)

  // 检查业务状态码
  if (result.code !== 200) {
    const errorMessage = result.message || '上传失败'

    // 检查是否是登录过期
    if (isLoginExpiredMessage(errorMessage)) {
      handleAuthExpired()
    }

    throw new ApiError(errorMessage, result.code)
  }

  // 返回文件 URL 和文件名
  return {
    url: result.data.fileUrl,
    fileName: result.data.fileName,
  }
}
