import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = cookies()

  // 清除 token cookie
  const response = NextResponse.redirect(new URL('/login', request.url))

  // 清除 token cookie
  response.cookies.set({
    name: 'token',
    value: '',
    maxAge: 0,
    path: '/',
  })

  return response
}
