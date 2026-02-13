/**
 * 认证相关 API（使用双 Token 无感刷新）
 */

import { get, post } from '../client'
import type { ApiResponse } from '../types'
import {
  setTokens,
  clearTokens,
  isAuthenticated,
  getTokenRemainingTime,
  startTokenRefreshTimer,
  type TokenPair,
} from '@/lib/auth/dual-token-manager'

/**
 * 登录请求
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  username: string
  email: string
  password: string
  nickname?: string
}

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string
  refreshToken: string
  expiresIn: number // Access Token 过期时间（秒）
  userInfo: {
    id: number
    username: string
    email: string
    nickname: string
    avatar: string | null
  }
}

/**
 * 刷新 Token 响应
 */
export interface RefreshTokenResponse {
  token: string
  refreshToken: string
  expiresIn: number
  userInfo: {
    id: number
    username: string
    email: string
    nickname: string
    avatar: string | null
  }
}

/**
 * Token 刷新函数（供 Token Manager 调用）
 */
export async function refreshTokenApi(refreshToken: string): Promise<TokenPair> {
  const response = await post<ApiResponse<RefreshTokenResponse>>('/api/auth/refresh-token', {
    refreshToken,
  })

  if (response.code === 200 && response.data) {
    const { token, refreshToken: newRefreshToken, expiresIn, userInfo } = response.data

    // 更新用户信息
    if (typeof window !== 'undefined') {
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
    }

    // 触发自定义事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'))
    }

    return {
      accessToken: token,
      refreshToken: newRefreshToken,
      expiresIn,
    }
  }

  throw new Error(response.message || '刷新 token 失败')
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await post<ApiResponse<LoginResponse>>('/api/auth/login', data)

  if (response.code === 200 && response.data) {
    const { token, refreshToken, expiresIn, userInfo } = response.data

    // 保存 token
    setTokens({
      accessToken: token,
      refreshToken: refreshToken,
      expiresIn: expiresIn,
    })

    // 保存用户信息
    if (typeof window !== 'undefined') {
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
    }

    // 触发自定义事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'))
    }

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
    const { token, refreshToken, expiresIn, userInfo } = response.data

    // 保存 token
    setTokens({
      accessToken: token,
      refreshToken: refreshToken,
      expiresIn: expiresIn,
    })

    // 保存用户信息
    if (typeof window !== 'undefined') {
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
    }

    // 触发自定义事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'))
    }

    return response.data
  }

  throw new Error(response.message || '注册失败')
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  try {
    await post('/api/auth/logout', {})
  } finally {
    // 清除本地存储
    clearTokens()

    if (typeof window !== 'undefined') {
      localStorage.removeItem('userInfo')
    }

    // 触发自定义事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'))
    }
  }
}

/**
 * 获取当前用户信息
 */
export async function getUserInfo(): Promise<LoginResponse['userInfo']> {
  const response = await get<ApiResponse<LoginResponse['userInfo']>>('/api/auth/user-info')

  if (response.code === 200 && response.data) {
    // 更新本地存储
    if (typeof window !== 'undefined') {
      localStorage.setItem('userInfo', JSON.stringify(response.data))
    }

    return response.data
  }

  throw new Error(response.message || '获取用户信息失败')
}

/**
 * 获取本地存储的用户信息
 */
export function getLocalUserInfo(): LoginResponse['userInfo'] | null {
  if (typeof window === 'undefined') return null

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
export { isAuthenticated }

/**
 * 获取 Token 剩余有效时间（秒）
 */
export { getTokenRemainingTime }

/**
 * 启动 Token 刷新定时器
 */
export { startTokenRefreshTimer }
