/**
 * 客户端认证相关工具函数（浏览器环境使用）
 */

import { post, get } from './api-client'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  nickname?: string
}

export interface LoginResponse {
  token: string
  refreshToken: string
  userInfo: {
    id: number
    username: string
    email: string
    nickname: string
    avatar: string | null
  }
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

// Token刷新锁，防止并发刷新
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

/**
 * 添加刷新订阅者
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
 * 刷新token
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await post<ApiResponse<LoginResponse>>('/api/auth/refresh-token', {
    refreshToken
  })

  if (response.code === 200 && response.data) {
    const { token, refreshToken: newRefreshToken, userInfo } = response.data

    // 更新localStorage和cookie
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', newRefreshToken)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
    document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`

    return token
  }

  throw new Error(response.message || '刷新token失败')
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await post<ApiResponse<LoginResponse>>('/api/auth/login', data)

  if (response.code === 200 && response.data) {
    const { token, refreshToken, userInfo } = response.data

    // 保存token和refreshToken到localStorage
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`

    // 保存用户信息
    localStorage.setItem('userInfo', JSON.stringify(userInfo))

    // 触发自定义事件，通知 GlobalHeader 更新状态
    window.dispatchEvent(new Event('auth-change'))

    return response.data
  }

  throw new Error(response.message || '登录失败')
}

/**
 * 用户注册
 */
export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const response = await post<ApiResponse<LoginResponse>>('/api/auth/register', data)

  if (response.code === 200 && response.data) {
    const { token, refreshToken, userInfo } = response.data

    // 保存token和refreshToken到localStorage
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`

    // 保存用户信息
    localStorage.setItem('userInfo', JSON.stringify(userInfo))

    // 触发自定义事件，通知 GlobalHeader 更新状态
    window.dispatchEvent(new Event('auth-change'))

    return response.data
  }

  throw new Error(response.message || '注册失败')
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  try {
    const token = getToken()
    if (token) {
      await post('/api/auth/logout', {})
    }
  } finally {
    // 清除本地存储和cookie
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')
    document.cookie = 'token=; path=/; max-age=0'

    // 触发自定义事件，通知 GlobalHeader 更新状态
    window.dispatchEvent(new Event('auth-change'))
  }
}

/**
 * 获取当前用户信息
 */
export async function getUserInfo(): Promise<LoginResponse['userInfo']> {
  const response = await get<ApiResponse<LoginResponse['userInfo']>>('/api/auth/user-info')

  if (response.code === 200 && response.data) {
    // 更新本地存储
    localStorage.setItem('userInfo', JSON.stringify(response.data))
    return response.data
  }

  throw new Error(response.message || '获取用户信息失败')
}

/**
 * 获取本地存储的用户信息
 */
export function getLocalUserInfo(): LoginResponse['userInfo'] | null {
  const userInfoStr = localStorage.getItem('userInfo')
  if (userInfoStr) {
    try {
      return JSON.parse(userInfoStr)
    } catch {
      return null
    }
  }
  return null
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token')
}

/**
 * 获取token（优先从localStorage）
 */
export function getToken(): string | null {
  return localStorage.getItem('token')
}

/**
 * 获取refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}
