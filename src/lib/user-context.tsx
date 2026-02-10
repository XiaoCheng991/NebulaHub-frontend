"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getLocalUserInfo } from './client-auth'
import { useRouter } from 'next/navigation'

interface UserProfile {
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string
}

interface UserContextType {
  user: UserProfile | null
  loading: boolean
  error: string | null
  refreshUser: () => Promise<void>
  updateUser: (updates: Partial<UserProfile>) => void
  clearUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // 从服务器获取最新的用户信息
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      const response = await fetch('http://localhost:8080/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('获取用户信息失败')
      }

      const data = await response.json()
      if (data.code === 200 && data.data) {
        setUser({
          username: data.data.username,
          displayName: data.data.displayName,
          avatarUrl: data.data.avatar,
          bio: data.data.bio || '',
        })

        // 同步更新 localStorage
        const localUser = getLocalUserInfo()
        if (localUser) {
          const updatedUser = {
            ...localUser,
            nickname: data.data.displayName,
            avatar: data.data.avatar,
          }
          localStorage.setItem('userInfo', JSON.stringify(updatedUser))
        }
      } else {
        throw new Error(data.message || '获取用户信息失败')
      }
    } catch (err: any) {
      console.error('Error fetching user info:', err)
      setError(err.message)

      // 如果是认证错误，跳转到登录页
      if (err.message.includes('401') || err.message.includes('登录')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  // 更新用户信息（本地更新，不调用接口）
  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...updates }

      // 同步更新 localStorage
      const localUser = getLocalUserInfo()
      if (localUser) {
        const updatedLocalUser = {
          ...localUser,
          nickname: updates.displayName || localUser.nickname,
          avatar: updates.avatarUrl || localUser.avatar,
        }
        localStorage.setItem('userInfo', JSON.stringify(updatedLocalUser))
      }

      return updated
    })
  }, [])

  // 清除用户信息
  const clearUser = useCallback(() => {
    setUser(null)
    setError(null)
  }, [])

  // 初始化：从 localStorage 读取，然后从服务器获取最新数据
  useEffect(() => {
    const localUser = getLocalUserInfo()
    if (localUser) {
      // 先使用本地数据快速显示
      setUser({
        username: localUser.username,
        displayName: localUser.nickname || '',
        avatarUrl: localUser.avatar || null,
        bio: '',
      })
    }

    // 然后从服务器获取最新数据
    refreshUser()
  }, [refreshUser])

  // 监听认证变化事件（登录/退出）
  useEffect(() => {
    const handleAuthChange = () => {
      const localUser = getLocalUserInfo()
      if (localUser) {
        setUser({
          username: localUser.username,
          displayName: localUser.nickname || '',
          avatarUrl: localUser.avatar || null,
          bio: '',
        })
        refreshUser()
      } else {
        clearUser()
      }
    }

    window.addEventListener('auth-change', handleAuthChange)
    return () => {
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [refreshUser, clearUser])

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  )
}

// Hook for using user context
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
