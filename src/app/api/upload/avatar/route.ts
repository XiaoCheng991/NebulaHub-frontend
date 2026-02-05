import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { uploadFile, deleteFile, isMinioUrl, extractObjectName, validateMinioConfig } from '@/lib/minio'

/**
 * POST /api/upload/avatar - 上传头像
 */
export async function POST(req: NextRequest) {
  try {
    console.log('=== 开始处理头像上传请求 ===')

    // 验证MinIO配置
    const configValidation = validateMinioConfig()
    if (!configValidation.valid) {
      console.error('MinIO配置错误:', configValidation.error)
      return NextResponse.json(
        { error: 'MinIO配置错误: ' + configValidation.error },
        { status: 500 }
      )
    }

    // 1. 验证用户身份
    console.log('步骤1: 验证用户身份...')
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('用户验证失败:', authError)
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }
    console.log('用户验证成功:', user.id)

    // 2. 解析表单数据
    console.log('步骤2: 解析表单数据...')
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const oldAvatarUrl = formData.get('oldAvatarUrl') as string | null

    if (!file) {
      console.error('未找到文件')
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      )
    }
    console.log('文件信息:', { name: file.name, type: file.type, size: file.size })

    // 3. 验证文件类型
    if (!file.type.startsWith('image/')) {
      console.error('文件类型错误:', file.type)
      return NextResponse.json(
        { error: '只支持图片文件' },
        { status: 400 }
      )
    }

    // 4. 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      console.error('文件过大:', file.size)
      return NextResponse.json(
        { error: '文件大小不能超过5MB' },
        { status: 400 }
      )
    }

    // 5. 转换文件为Buffer
    console.log('步骤3: 转换文件为Buffer...')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log('Buffer创建成功，大小:', buffer.length)

    // 6. 删除旧头像（如果存在且是MinIO URL）
    if (oldAvatarUrl && isMinioUrl(oldAvatarUrl)) {
      console.log('步骤4: 删除旧头像...', oldAvatarUrl)
      const oldObjectName = extractObjectName(oldAvatarUrl)
      if (oldObjectName && oldObjectName.startsWith('avatars/')) {
        try {
          await deleteFile(oldObjectName)
          console.log('旧头像删除成功')
        } catch (error) {
          console.error('删除旧头像失败:', error)
          // 不阻断新头像上传，只记录错误
        }
      }
    }

    // 7. 生成新文件名并上传
    console.log('步骤5: 上传新头像到MinIO...')
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}_${Date.now()}.${fileExt}`
    const objectName = `avatars/${fileName}`

    const publicUrl = await uploadFile(objectName, buffer, file.type)
    console.log('MinIO上传成功，URL:', publicUrl)

    // 8. 更新数据库
    console.log('步骤6: 更新数据库...')
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }
    console.log('数据库更新成功')

    console.log('=== 头像上传完成 ===')
    return NextResponse.json({
      success: true,
      url: publicUrl,
    })

  } catch (error: any) {
    console.error('=== 头像上传错误 ===:', error)
    return NextResponse.json(
      { error: error.message || '头像上传失败', details: error.toString() },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/upload/avatar - 删除头像
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. 验证用户身份
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 2. 获取请求体
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json(
        { error: '缺少URL参数' },
        { status: 400 }
      )
    }

    // 3. 验证是否为MinIO URL
    if (!isMinioUrl(url)) {
      return NextResponse.json(
        { error: '不是MinIO管理的URL' },
        { status: 400 }
      )
    }

    // 4. 提取对象名称并删除
    const objectName = extractObjectName(url)

    if (!objectName) {
      return NextResponse.json(
        { error: '无法解析文件路径' },
        { status: 400 }
      )
    }

    // 5. 验证文件属于该用户（安全检查）
    if (!objectName.startsWith(`avatars/${user.id}_`)) {
      return NextResponse.json(
        { error: '无权删除此文件' },
        { status: 403 }
      )
    }

    await deleteFile(objectName)

    return NextResponse.json({
      success: true,
    })

  } catch (error: any) {
    console.error('头像删除错误:', error)
    return NextResponse.json(
      { error: error.message || '头像删除失败' },
      { status: 500 }
    )
  }
}
