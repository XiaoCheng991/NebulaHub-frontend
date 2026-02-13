"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { getUserProfile, getLocalUserInfo, setupTokenRefresh, refreshTokenApi, startTokenRefreshTimer } from '@/lib/api'
import { initTokenManager, isAuthenticated } from '@/lib/auth/dual-token-manager'
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
  // 用于跟踪是否有本地数据，避免不必要地显示 loading
  const hasLocalDataRef = useRef(false)

  // 初始化 Token Manager 和 Token 刷新函数
  useEffect(() => {
    console.log('[UserProvider] 初始化 Token Manager...')

    // 1. 初始化 Token Manager（从 localStorage 恢复）
    initTokenManager()

    // 2. 设置 Token 刷新函数
    setupTokenRefresh(async (refreshToken: string) => {
      console.log('[UserProvider] 调用 Token 刷新函数...')
      return refreshTokenApi(refreshToken)
    })

    // 3. 启动 Token 刷新定时器（主动刷新）
    const cleanupTimer = startTokenRefreshTimer(30 * 1000) // 每 30 秒检查一次

    console.log('[UserProvider] Token Manager 已初始化')

    // 组件卸载时清理定时器
    return () => {
      cleanupTimer()
      console.log('[UserProvider] Token 刷新定时器已停止')
    }
  }, [])

  // 从服务器获取最新的用户信息
  const refreshUser = useCallback(async (silent: boolean = false) => {
    try {
      // 只在没有本地数据且不是静默刷新时显示 loading
      if (!hasLocalDataRef.current && !silent) {
        setLoading(true)
      }
      setError(null)

      if (!isAuthenticated()) {
        setUser(null)
        setLoading(false)
        hasLocalDataRef.current = false
        return
      }

      const data = await getUserProfile()
      setUser({
        username: data.username,
        displayName: data.displayName,
        avatarUrl: data.avatar,
        bio: data.bio || '',
      })

      // 同步更新 localStorage
      const localUser = getLocalUserInfo()
      if (localUser) {
        const updatedUser = {
          ...localUser,
          nickname: data.displayName,
          avatar: data.avatar,
        }
        localStorage.setItem('userInfo', JSON.stringify(updatedUser))
      }
    } catch (err: any) {
      console.error('[UserProvider] 获取用户信息失败:', err)
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
    hasLocalDataRef.current = false
  }, [])

  // 初始化：从 localStorage 读取，然后从服务器获取最新数据
  useEffect(() => {
    const localUser = getLocalUserInfo()
    if (localUser) {
      // 标记有本地数据
      hasLocalDataRef.current = true
      // 先使用本地数据快速显示
      setUser({
        username: localUser.username,
        displayName: localUser.nickname || '',
        avatarUrl: localUser.avatar || null,
        bio: '',
      })
      // 有本地数据时立即结束 loading 状态
      setLoading(false)
    }

    // 然后从服务器获取最新数据（静默更新）
    refreshUser(true)
  }, [refreshUser])

  // 监听认证变化事件（登录/退出）
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('[UserProvider] 检测到认证状态变化')
      const localUser = getLocalUserInfo()
      if (localUser) {
        hasLocalDataRef.current = true
        setUser({
          username: localUser.username,
          displayName: localUser.nickname || '',
          avatarUrl: localUser.avatar || null,
          bio: '',
        })
        setLoading(false)
        refreshUser(true)
      } else {
        clearUser()
        setLoading(false)
      }
    }

    window.addEventListener('auth-change', handleAuthChange)
    return () => {
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [refreshUser, clearUser])

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser: () => refreshUser(), updateUser, clearUser }}>
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
