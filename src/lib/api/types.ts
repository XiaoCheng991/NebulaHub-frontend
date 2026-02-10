/**
 * API 通用类型定义
 */

/**
 * 标准 API 响应格式
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * 请求配置选项
 */
export interface RequestConfig extends RequestInit {
  /** 是否跳过 token 注入 */
  skipAuth?: boolean
  /** 是否跳过错误处理 */
  skipErrorHandler?: boolean
  /** 请求超时时间（毫秒） */
  timeout?: number
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: number,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 请求元数据（用于日志）
 */
export interface RequestMetadata {
  url: string
  method: string
  timestamp: number
  duration?: number
  success: boolean
  statusCode?: number
  errorMessage?: string
}
