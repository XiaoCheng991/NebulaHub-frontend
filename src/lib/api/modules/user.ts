/**
 * 用户相关 API
 */

import { get, put } from '../client'
import type { ApiResponse } from '../types'

/**
 * 用户资料
 */
export interface UserProfile {
  id: number
  username: string
  displayName: string
  email: string
  avatar: string | null
  bio: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 更新用户资料请求
 */
export interface UpdateProfileRequest {
  displayName?: string
  bio?: string
  avatar?: string
}

/**
 * 获取用户资料
 */
export async function getUserProfile(): Promise<UserProfile> {
  const response = await get<ApiResponse<UserProfile>>('/api/user/profile')

  if (response.code === 200 && response.data) {
    return response.data
  }

  throw new Error(response.message || '获取用户资料失败')
}

/**
 * 更新用户资料
 */
export async function updateUserProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  const response = await put<ApiResponse<UserProfile>>('/api/user/profile', data)

  if (response.code === 200 && response.data) {
    // 同步更新本地存储
    if (typeof window !== 'undefined') {
      const userInfoStr = localStorage.getItem('userInfo')
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr)
          const updatedUserInfo = {
            ...userInfo,
            nickname: data.displayName || userInfo.nickname,
            avatar: data.avatar || userInfo.avatar,
          }
          localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo))
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    return response.data
  }

  throw new Error(response.message || '更新用户资料失败')
}

/**
 * 更新用户头像
 */
export async function updateUserAvatar(avatarUrl: string): Promise<UserProfile> {
  return updateUserProfile({ avatar: avatarUrl })
}

/**
 * 更新用户昵称
 */
export async function updateUserDisplayName(displayName: string): Promise<UserProfile> {
  return updateUserProfile({ displayName })
}

/**
 * 更新用户简介
 */
export async function updateUserBio(bio: string): Promise<UserProfile> {
  return updateUserProfile({ bio })
}
