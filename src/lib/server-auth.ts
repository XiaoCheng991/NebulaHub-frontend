/**
 * 服务端认证工具函数（Server Components使用）
 */

import { cookies } from 'next/headers'

export interface ServerUserInfo {
  id: number
  username: string
  email: string
  nickname: string
  avatar: string | null
}

/**
 * 服务端获取token（从cookie）
 */
export function getServerToken(): string | null {
  const cookieStore = cookies()
  return cookieStore.get('token')?.value || null
}

/**
 * 服务端检查是否已登录
 */
export function isServerAuthenticated(): boolean {
  return !!getServerToken()
}

/**
 * 服务端获取用户信息（通过调用后端API）
 */
export async function getServerUserInfo(): Promise<ServerUserInfo | null> {
  const token = getServerToken()

  if (!token) {
    return null
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const response = await fetch(`${baseUrl}/api/auth/user-info`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data.code === 200) {
        return data.data
      }
    }

    return null
  } catch (error) {
    console.error('获取服务端用户信息失败:', error)
    return null
  }
}
