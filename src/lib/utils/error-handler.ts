/**
 * 统一错误处理工具
 */

import { ApiError } from '@/lib/api/types'
import { apiLogger } from './logger'

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  BUSINESS = 'BUSINESS_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * 从错误中提取用户友好的消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return '发生未知错误，请稍后重试'
}

/**
 * 根据状态码确定错误类型
 */
export function getErrorType(statusCode: number, message?: string): ErrorType {
  switch (statusCode) {
    case 401:
    case 403:
      return ErrorType.AUTH
    case 400:
      return message?.includes('验证') || message?.includes('valid')
        ? ErrorType.VALIDATION
        : ErrorType.BUSINESS
    case 404:
      return ErrorType.BUSINESS
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER
    default:
      return ErrorType.UNKNOWN
  }
}

/**
 * 处理 API 错误
 */
export function handleApiError(
  error: unknown,
  context?: {
    url?: string
    method?: string
    silent?: boolean // 是否静默处理（不显示错误提示）
  }
): never {
  const errorMessage = getErrorMessage(error)
  const errorType = error instanceof ApiError
    ? getErrorType(error.code, error.message)
    : ErrorType.UNKNOWN

  // 记录错误日志
  apiLogger.error(`API Error: ${errorType}`, {
    message: errorMessage,
    context,
  })

  // 静默处理：不抛出错误（用于某些特定场景）
  if (context?.silent) {
    throw error
  }

  // 认证错误：触发登出逻辑
  if (errorType === ErrorType.AUTH && typeof window !== 'undefined') {
    // 触发登出事件
    window.dispatchEvent(new CustomEvent('auth-expired'))
  }

  throw error
}

/**
 * 创建标准错误响应
 */
export function createErrorResponse(message: string, code: number = 500): ApiError {
  return new ApiError(message, code)
}

/**
 * 判断是否为网络错误
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }
  return false
}

/**
 * 判断是否为认证错误
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError && (error.code === 401 || error.code === 403)) {
    return true
  }
  return false
}
