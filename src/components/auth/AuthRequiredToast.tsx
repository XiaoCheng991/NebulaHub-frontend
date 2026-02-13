"use client"

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

/**
 * 认证提示组件
 *
 * 检测 URL 中的 auth=required 参数，显示登录提示
 */
export function AuthRequiredToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('auth') === 'required') {
      toast({
        title: '⚠️ 访问受限',
        description: (
          <div className="space-y-1">
            <p className="text-red-500 font-medium">该页面需要登录后才能访问</p>
            <p className="text-sm opacity-80">请点击右上角登录按钮继续</p>
          </div>
        ),
        variant: 'destructive',
      })

      // 清除 URL 中的 auth 参数，避免刷新时重复提示
      const url = new URL(window.location.href)
      url.searchParams.delete('auth')
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [searchParams, router])

  return null
}
