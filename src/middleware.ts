import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js 中间件 - 服务端路由保护
 *
 * 保护策略：
 * 1. 公开页面：首页、登录、注册、忘记密码 - 无需认证
 * 2. 受保护页面：dashboard、chat、drive、settings - 需要认证，未登录重定向到首页并提示
 * 3. 已登录用户访问登录/注册页 -> 重定向到 dashboard
 * 4. 已登录用户访问首页 -> 重定向到 dashboard
 */

// 受保护的路径列表
const protectedPaths = ['/dashboard', '/chat', '/drive', '/settings']

// 公开路径（无需登录）
const publicPaths = ['/', '/login', '/register', '/forgot-password']

export async function middleware(req: NextRequest) {
  // 从 cookie 获取 token（使用新的 auth_access_token key）
  const token = req.cookies.get('auth_access_token')?.value

  const { pathname } = req.nextUrl
  const isLoggedIn = !!token

  // 情况1：已登录用户访问登录/注册页 -> 重定向到 dashboard
  if ((pathname === '/login' || pathname === '/register') && isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 情况2：已登录用户访问首页 -> 重定向到 dashboard
  if (pathname === '/' && isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 情况3：未登录用户访问受保护页面 -> 重定向到首页并带上提示参数
  const isProtectedPath = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  if (isProtectedPath && !isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('auth', 'required')
    return NextResponse.redirect(url)
  }

  // 其他情况放行
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
