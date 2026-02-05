// 此文件已废弃
// GitHub OAuth 回调现在由 /auth/github/callback/page.tsx 处理
// 保留此文件以避免旧链接报错
import { redirect } from "next/navigation"

export async function GET(request: Request) {
  // 重定向到登录页
  return redirect("/login")
}
