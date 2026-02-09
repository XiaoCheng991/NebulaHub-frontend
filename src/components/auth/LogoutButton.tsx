"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { logout } from "@/lib/client-auth"

export function LogoutButton({ className, iconOnly }: { className?: string, iconOnly?: boolean }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // 调用 logout 函数清除本地存储和cookie
      await logout()

      // 跳转到登录页
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 图标模式的样式 - 更优雅的圆形按钮
  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        className={`h-9 w-9 p-0 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 ${className || ''}`}
        onClick={handleLogout}
        disabled={isLoading}
        title="退出登录"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
      </Button>
    )
  }

  // 完整按钮模式的样式
  return (
    <Button
      variant="outline"
      className={`w-full justify-start gap-2 rounded-2xl font-medium bg-white/80 dark:bg-gray-700/80 hover:bg-red-50/80 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 ${className || ''}`}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {isLoading ? "退出中..." : "退出登录"}
    </Button>
  )
}
