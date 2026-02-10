/**
 * 核心 HTTP 客户端
 * 提供统一的请求方法，支持自动 Token 注入和刷新
 * 支持 SSR/CSR 自动适配
 */

import {
  ApiResponse,
  RequestConfig,
  ApiError,
  RequestMetadata,
} from './types'
import {
  getAccessToken,
  refreshAccessToken,
  setTokenRefreshFn,
} from '@/lib/auth/token-manager'
import { apiLogger } from '@/lib/utils/logger'
import { handleApiError } from '@/lib/utils/error-handler'

/**
 * API 基础 URL
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * 设置 Token 刷新函数（由调用方设置）
 * 这里我们使用 auth 模块的刷新函数
 */
export function setupTokenRefresh(refreshFn: () => Promise<string>) {
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
    const token = getAccessToken()
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
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
    if (response.status === 401 && getAccessToken() && !config.skipAuth) {
      try {
        const newToken = await refreshAccessToken()

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
      } catch (refreshError) {
        // Token 刷新失败
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
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
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
        method: config.method || 'GET',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: false,
        statusCode: response.status,
        errorMessage: errorData.message,
      }

      apiLogger.requestError(metadata)

      throw new ApiError(errorData.message || '请求失败', response.status)
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
      throw new ApiError(result.message || '请求失败', result.code)
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
      token = await refreshAccessToken()
      response = await uploadWithToken(token)
    } catch (refreshError) {
      // Token 刷新失败
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
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

    throw new ApiError(errorData.message || '上传失败', response.status)
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
    throw new ApiError(result.message || '上传失败', result.code)
  }

  // 返回文件 URL 和文件名
  return {
    url: result.data.fileUrl,
    fileName: result.data.fileName,
  }
}
