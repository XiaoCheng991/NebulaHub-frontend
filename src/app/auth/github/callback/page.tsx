"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { CheckCircle, XCircle } from "lucide-react"

export default function GitHubCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    const token = searchParams.get("token")

    if (token) {
      // 保存token
      localStorage.setItem("token", token)

      // 获取用户信息
      fetch("http://localhost:8080/api/auth/user-info", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.code === 200 && data.data) {
            localStorage.setItem("userInfo", JSON.stringify(data.data))
            setStatus("success")

            toast({
              title: "登录成功",
              description: "正在跳转...",
            })

            setTimeout(() => {
              router.push("/dashboard")
            }, 1500)
          } else {
            setStatus("error")
          }
        })
        .catch((error) => {
          console.error("获取用户信息失败", error)
          setStatus("error")
        })
    } else {
      setStatus("error")
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <p className="text-muted-foreground">正在处理GitHub登录...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl mb-2">登录成功！</CardTitle>
              <p className="text-muted-foreground">欢迎回来，正在跳转...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl mb-2">登录失败</CardTitle>
              <p className="text-muted-foreground mb-6">
                GitHub登录过程中出现错误，请重试
              </p>
              <Button onClick={() => router.push("/login")}>
                返回登录
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
