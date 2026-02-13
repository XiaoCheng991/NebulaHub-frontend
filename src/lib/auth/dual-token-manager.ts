/**
 * 双 Token 无感刷新管理器
 *
 * 业界标准的 JWT 双 Token 认证机制：
 * - Access Token: 短期有效（15-30分钟），用于 API 认证
 * - Refresh Token: 长期有效（7-30天），用于刷新 Access Token
 *
 * 刷新策略：
 * 1. 主动刷新：在 Access Token 过期前 5 分钟自动刷新
 * 2. 被动刷新：收到 401 响应时立即刷新
 * 3. 并发控制：多个请求同时过期时，只触发一次刷新
 */

/**
 * Token 对象
 */
export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number // 过期时间（秒）
}

/**
 * Token 信息
 */
interface TokenInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number // 过期时间戳（毫秒）
}

// 存储键
const ACCESS_TOKEN_KEY = 'auth_access_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'
const EXPIRES_AT_KEY = 'auth_expires_at'

// 内存中的 token 信息（用于快速访问）
let tokenInfo: TokenInfo | null = null

// 刷新锁
let isRefreshing = false
let refreshPromise: Promise<string> | null = null

// 刷新订阅者
type RefreshCallback = (token: string) => void
const refreshSubscribers: RefreshCallback[] = []

/**
 * 检查是否为浏览器环境
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * 从 localStorage 加载 token
 */
function loadTokensFromStorage(): TokenInfo | null {
  if (!isBrowser()) return null

  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const expiresAtStr = localStorage.getItem(EXPIRES_AT_KEY)

    if (!accessToken || !refreshToken || !expiresAtStr) {
      return null
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: parseInt(expiresAtStr, 10),
    }
  } catch {
    return null
  }
}

/**
 * 初始化 Token Manager（从 localStorage 恢复）
 */
export function initTokenManager(): void {
  if (tokenInfo) return // 已初始化

  tokenInfo = loadTokensFromStorage()

  // 检查 token 是否已过期
  if (tokenInfo && isAccessTokenExpired()) {
    clearTokens()
  }
}

/**
 * 设置 Token 对
 */
export function setTokens(tokens: TokenPair): void {
  if (!isBrowser()) return

  const now = Date.now()
  const expiresAt = now + tokens.expiresIn * 1000

  // 更新内存
  tokenInfo = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt,
  }

  // 持久化到 localStorage
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString(10))

  // 同步到 cookie（用于 SSR）
  document.cookie = `${ACCESS_TOKEN_KEY}=${tokens.accessToken}; path=/; max-age=${tokens.expiresIn}`

  console.log('[TokenManager] Token 已设置，过期时间:', new Date(expiresAt).toLocaleString())
}

/**
 * 获取 Access Token
 */
export function getAccessToken(): string | null {
  if (!tokenInfo) {
    initTokenManager()
  }

  return tokenInfo?.accessToken || null
}

/**
 * 获取 Refresh Token
 */
export function getRefreshToken(): string | null {
  if (!tokenInfo) {
    initTokenManager()
  }

  return tokenInfo?.refreshToken || null
}

/**
 * 检查 Access Token 是否已过期
 */
export function isAccessTokenExpired(): boolean {
  if (!tokenInfo) {
    initTokenManager()
  }

  if (!tokenInfo) return true

  // 提前 5 分钟判断为过期，以便主动刷新
  const now = Date.now()
  const expiredTime = tokenInfo.expiresAt - 5 * 60 * 1000 // 提前 5 分钟

  return now >= expiredTime
}

/**
 * 检查是否需要刷新 Token
 */
export function shouldRefreshToken(): boolean {
  return isAccessTokenExpired()
}

/**
 * 获取 Token 剩余有效时间（秒）
 */
export function getTokenRemainingTime(): number {
  if (!tokenInfo) {
    initTokenManager()
  }

  if (!tokenInfo) return 0

  const now = Date.now()
  const remaining = Math.max(0, tokenInfo.expiresAt - now)

  return Math.floor(remaining / 1000)
}

/**
 * 添加刷新订阅者
 */
function subscribeTokenRefresh(callback: RefreshCallback): void {
  refreshSubscribers.push(callback)
}

/**
 * 通知所有订阅者 Token 已刷新
 */
function notifyTokenRefreshed(token: string): void {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers.length = 0 // 清空订阅者
}

/**
 * 清除所有 Token
 */
export function clearTokens(): void {
  // 清除内存
  tokenInfo = null

  if (!isBrowser()) return

  // 清除 localStorage
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)

  // 清除 cookie
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0`

  console.log('[TokenManager] Token 已清除')
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken()
  return !!token && !isAccessTokenExpired()
}

/**
 * Token 刷新函数类型
 */
export type TokenRefreshFn = (refreshToken: string) => Promise<TokenPair>

/**
 * 设置 Token 刷新函数
 */
let refreshAccessTokenFn: TokenRefreshFn | null = null

export function setTokenRefreshFn(fn: TokenRefreshFn): void {
  refreshAccessTokenFn = fn
}

/**
 * 刷新 Access Token（核心方法）
 *
 * @returns 新的 Access Token
 * @throws 如果刷新失败
 */
export async function refreshAccessToken(): Promise<string> {
  // 如果正在刷新，返回同一个 Promise
  if (isRefreshing && refreshPromise) {
    console.log('[TokenManager] 等待刷新完成...')
    return refreshPromise
  }

  // 获取 refresh token
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  // 开始刷新
  isRefreshing = true

  // 创建刷新 Promise
  refreshPromise = (async () => {
    try {
      if (!refreshAccessTokenFn) {
        throw new Error('Token refresh function not set')
      }

      console.log('[TokenManager] 开始刷新 Token...')

      // 调用刷新接口
      const newTokens = await refreshAccessTokenFn(refreshToken)

      // 更新 token
      setTokens(newTokens)

      // 通知所有订阅者
      notifyTokenRefreshed(newTokens.accessToken)

      console.log('[TokenManager] Token 刷新成功')

      return newTokens.accessToken
    } catch (error) {
      console.error('[TokenManager] Token 刷新失败:', error)

      // 刷新失败，清除所有 token
      clearTokens()

      throw error
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * 确保获取有效的 Access Token
 *
 * 如果 token 已过期或即将过期，自动刷新
 *
 * @returns 有效的 Access Token
 * @throws 如果无法获取有效 token
 */
export async function ensureValidAccessToken(): Promise<string> {
  // 检查是否需要刷新
  if (shouldRefreshToken()) {
    console.log('[TokenManager] Token 已过期，开始刷新...')
    return refreshAccessToken()
  }

  // 返回当前 token
  const token = getAccessToken()
  if (!token) {
    throw new Error('No access token available')
  }

  return token
}

/**
 * 启动 Token 主动刷新定时器
 *
 * @param interval 检查间隔（毫秒），默认每 30 秒检查一次
 * @returns 清理函数
 */
export function startTokenRefreshTimer(interval: number = 30 * 1000): () => void {
  if (!isBrowser()) return () => {}

  const timerId = setInterval(async () => {
    if (isAuthenticated() && shouldRefreshToken()) {
      console.log('[TokenManager] 定时器：检测到 Token 需要刷新')
      try {
        await refreshAccessToken()
      } catch (error) {
        console.error('[TokenManager] 定时器刷新失败:', error)
        // 刷新失败时不做处理，会在下次 API 请求时重试
      }
    }
  }, interval)

  console.log('[TokenManager] Token 刷新定时器已启动')

  // 返回清理函数
  return () => {
    clearInterval(timerId)
    console.log('[TokenManager] Token 刷新定时器已停止')
  }
}
