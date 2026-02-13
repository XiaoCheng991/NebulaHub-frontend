/**
 * 登录提示 Hook
 *
 * 提供人性化的登录提示，而不是强制跳转
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { initTokenManager, isAuthenticated } from '@/lib/auth/dual-token-manager'
import React from 'react'

interface LoginPromptOptions {
  /**
   * 提示标题
   */
  title?: string
  /**
   * 提示内容
   */
  message?: string
  /**
   * 是否自动跳转到登录页
   * - true: 提示后跳转
   * - false: 只提示，用户手动选择
   */
  autoRedirect?: boolean
  /**
   * 跳转延迟（毫秒）
   */
  redirectDelay?: number
}

/**
 * 登录提示 Hook
 */
export function useAuthPrompt() {
  const router = useRouter()

  /**
   * 显示登录提示
   */
  const showLoginPrompt = useCallback((options: LoginPromptOptions = {}, currentPath?: string) => {
    const {
      title = '需要登录',
      message = '您需要登录才能查看此内容',
      autoRedirect = false,
      redirectDelay = 3000
    } = options

    // 初始化 Token Manager
    initTokenManager()

    // 如果已登录，不显示提示
    if (isAuthenticated()) {
      return true
    }

    // 显示 Toast 提示
    toast({
      title: '⚠️ ' + title,
      description: React.createElement(
        'div',
        { className: 'space-y-1' },
        React.createElement('p', { className: 'text-red-500 font-medium' }, message),
        React.createElement('p', { className: 'text-sm opacity-80' }, '请登录后继续操作')
      ),
      variant: 'destructive',
      action: React.createElement(
        ToastAction,
        {
          altText: '立即登录',
          onClick: () => {
            router.push(currentPath ? `/login?redirect=${encodeURIComponent(currentPath)}` : '/login')
          },
        },
        '立即登录'
      ) as React.ReactElement,
    })

    // 如果设置了自动跳转，延迟后跳转
    if (autoRedirect) {
      setTimeout(() => {
        router.push(currentPath ? `/login?redirect=${encodeURIComponent(currentPath)}` : '/login')
      }, redirectDelay)
    }

    return false
  }, [router])

  /**
   * 检查登录状态并提示
   *
   * @param currentPath 当前路径
   * @returns 是否已登录
   */
  const requireAuth = useCallback((currentPath?: string) => {
    // 初始化 Token Manager
    initTokenManager()

    if (isAuthenticated()) {
      return true
    }

    // 未登录，显示提示
    showLoginPrompt({
      title: '访问受限',
      message: '该页面需要登录后才能访问',
      autoRedirect: false,
    }, currentPath)

    return false
  }, [showLoginPrompt])

  /**
   * 检查未登录状态（用于登录/注册页）
   */
  const requireGuest = useCallback(() => {
    // 初始化 Token Manager
    initTokenManager()

    if (isAuthenticated()) {
      toast({
        title: '您已经登录了',
        description: '正在跳转到控制台...',
      })

      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

      return false
    }

    return true
  }, [router])

  return {
    showLoginPrompt,
    requireAuth,
    requireGuest,
  }
}
