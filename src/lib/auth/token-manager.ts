/**
 * Token 统一管理模块
 * 负责 Token 的获取、存储、删除和自动刷新
 * 支持 SSR/CSR 环境适配
 */

import { apiLogger } from '@/lib/utils/logger'

/**
 * Token 存储键
 */
const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'

/**
 * Token 刷新锁，防止并发刷新
 */
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

/**
 * 添加刷新订阅者
 */
function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

/**
 * 通知所有订阅者 token 已刷新
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

/**
 * 检查是否为浏览器环境
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * 获取 Access Token
 */
export function getAccessToken(): string | null {
  if (!isBrowser()) return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 获取 Refresh Token
 */
export function getRefreshToken(): string | null {
  if (!isBrowser()) return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * 保存 Token 对
 */
export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  if (!isBrowser()) return

  localStorage.setItem(TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)

  // 同步到 cookie（用于 SSR 认证）
  const maxAge = 7 * 24 * 60 * 60 // 7 天
  document.cookie = `${TOKEN_KEY}=${tokens.accessToken}; path=/; max-age=${maxAge}`

  apiLogger.auth('login', { accessToken: '***', refreshToken: '***' })
}

/**
 * 清除 Token
 */
export function clearTokens(): void {
  if (!isBrowser()) return

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`

  apiLogger.auth('logout')
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

/**
 * Token 刷新函数类型
 */
export type TokenRefreshFn = () => Promise<string>

/**
 * 设置 Token 刷新函数
 */
let refreshAccessTokenFn: TokenRefreshFn | null = null

export function setTokenRefreshFn(fn: TokenRefreshFn) {
  refreshAccessTokenFn = fn
}

/**
 * 刷新 Access Token
 * @returns 新的 Access Token
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  // 如果正在刷新，加入等待队列
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      subscribeTokenRefresh((token: string) => {
        resolve(token)
      })
    })
  }

  // 开始刷新
  isRefreshing = true

  try {
    if (!refreshAccessTokenFn) {
      throw new Error('Token refresh function not set')
    }

    const newToken = await refreshAccessTokenFn()
    isRefreshing = false
    onTokenRefreshed(newToken)

    apiLogger.tokenRefresh(true)
    return newToken
  } catch (error) {
    isRefreshing = false

    // 刷新失败，清除本地存储
    clearTokens()

    apiLogger.tokenRefresh(false, error as Error)

    throw new Error('Token refresh failed')
  }
}

/**
 * SSR 环境下从 Cookie 获取 Token
 */
export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map(c => c.trim())
  const tokenCookie = cookies.find(c => c.startsWith(`${TOKEN_KEY}=`))

  if (!tokenCookie) return null

  return tokenCookie.substring(TOKEN_KEY.length + 1)
}
