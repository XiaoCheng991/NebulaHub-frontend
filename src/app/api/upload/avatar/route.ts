import { NextRequest, NextResponse } from 'next/server'
import { getServerToken } from '@/lib/server-auth'

/**
 * POST /api/upload/avatar - 上传头像
 * 注意: 此路由已废弃，请使用后端Java API /api/file/upload
 */
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const token = getServerToken()
    if (!token) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: '此API已废弃，请使用Java后端 /api/file/upload' },
      { status: 410 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '请求失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/upload/avatar - 删除头像
 * 注意: 此路由已废弃
 */
export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { error: '此API已废弃，请使用Java后端文件管理API' },
    { status: 410 }
  )
}
