/**
 * 请求日志工具（仅开发环境）
 */

import { RequestMetadata } from '@/lib/api/types'

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * 日志级别
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

/**
 * 格式化请求元数据
 */
function formatRequestMetadata(metadata: RequestMetadata): string {
  const { url, method, timestamp, duration, success, statusCode, errorMessage } = metadata

  const timestampStr = new Date(timestamp).toLocaleTimeString()
  const durationStr = duration ? `${duration}ms` : 'N/A'
  const statusStr = statusCode ? `${statusCode}` : 'N/A'
  const errorStr = errorMessage ? ` | ${errorMessage}` : ''

  return `[${timestampStr}] ${method} ${url} | ${statusStr} | ${durationStr} | ${success ? 'SUCCESS' : 'FAILED'}${errorStr}`
}

/**
 * 输出日志（仅开发环境）
 */
function log(level: LogLevel, message: string, ...args: any[]) {
  if (!isDevelopment) return

  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`

  switch (level) {
    case 'info':
      console.log(prefix, message, ...args)
      break
    case 'warn':
      console.warn(prefix, message, ...args)
      break
    case 'error':
      console.error(prefix, message, ...args)
      break
    case 'debug':
      console.debug(prefix, message, ...args)
      break
  }
}

/**
 * API 请求日志
 */
export const apiLogger = {
  /**
   * 记录请求开始
   */
  requestStart(url: string, method: string, config?: RequestInit) {
    if (!isDevelopment) return

    log('debug', `→ ${method} ${url}`, {
      headers: config?.headers,
      body: config?.body,
    })
  },

  /**
   * 记录请求成功
   */
  requestSuccess(metadata: RequestMetadata) {
    if (!isDevelopment) return

    log('info', formatRequestMetadata(metadata))
  },

  /**
   * 记录请求失败
   */
  requestError(metadata: RequestMetadata) {
    if (!isDevelopment) return

    log('error', formatRequestMetadata(metadata))
  },

  /**
   * 记录 token 刷新
   */
  tokenRefresh(success: boolean, error?: Error) {
    if (!isDevelopment) return

    if (success) {
      log('info', 'Token refreshed successfully')
    } else {
      log('error', 'Token refresh failed', error)
    }
  },

  /**
   * 记录认证相关事件
   */
  auth(event: 'login' | 'logout' | 'token_expired', details?: any) {
    if (!isDevelopment) return

    log('info', `Auth: ${event}`, details)
  },

  /**
   * 通用信息日志
   */
  info(message: string, ...args: any[]) {
    log('info', message, ...args)
  },

  /**
   * 通用警告日志
   */
  warn(message: string, ...args: any[]) {
    log('warn', message, ...args)
  },

  /**
   * 通用错误日志
   */
  error(message: string, ...args: any[]) {
    log('error', message, ...args)
  },

  /**
   * 通用调试日志
   */
  debug(message: string, ...args: any[]) {
    log('debug', message, ...args)
  },
}
