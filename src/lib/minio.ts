import { Client } from 'minio'

// MinIO配置（从环境变量读取）
const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
  bucket: process.env.MINIO_BUCKET || 'user-uploads',
  publicUrl: process.env.MINIO_PUBLIC_URL || '',
}

/**
 * 验证MinIO配置是否完整
 */
export function validateMinioConfig(): { valid: boolean; error?: string } {
  if (!minioConfig.accessKey) {
    return { valid: false, error: '缺少MINIO_ACCESS_KEY环境变量' }
  }
  if (!minioConfig.secretKey) {
    return { valid: false, error: '缺少MINIO_SECRET_KEY环境变量' }
  }
  if (minioConfig.endPoint === 'localhost') {
    console.warn('⚠️ MINIO_ENDPOINT使用默认值localhost，请确认是否正确')
  }
  return { valid: true }
}

// 创建MinIO客户端实例（单例模式）
let minioClient: Client | null = null
let bucketChecked = false // 缓存桶检查状态

function getMinioClient(): Client {
  if (!minioClient) {
    console.log('初始化MinIO客户端:', {
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      bucket: minioConfig.bucket,
    })

    minioClient = new Client({
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
    })
  }
  return minioClient
}

/**
 * 确保存储桶存在
 */
async function ensureBucketExists(): Promise<void> {
  // 如果已经检查过，跳过
  if (bucketChecked) {
    return
  }

  const client = getMinioClient()

  try {
    console.log(`检查MinIO桶 "${minioConfig.bucket}" 是否存在...`)
    const exists = await client.bucketExists(minioConfig.bucket)

    if (!exists) {
      console.log(`桶不存在，正在创建桶 "${minioConfig.bucket}"...`)
      await client.makeBucket(minioConfig.bucket, 'us-east-1')
      console.log(`MinIO bucket "${minioConfig.bucket}" 创建成功`)

      // 设置桶为公开读取
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${minioConfig.bucket}/*`],
          },
        ],
      }
      await client.setBucketPolicy(minioConfig.bucket, JSON.stringify(policy))
      console.log(`MinIO bucket "${minioConfig.bucket}" 已设置为公开访问`)
    } else {
      console.log(`MinIO桶 "${minioConfig.bucket}" 已存在`)
    }

    bucketChecked = true
  } catch (error) {
    console.error('检查/创建MinIO桶时出错:', error)
    throw error
  }
}

/**
 * 上传文件到MinIO
 * @param objectName 对象名称（文件路径）
 * @param buffer 文件数据
 * @param contentType 文件MIME类型
 * @returns 文件的公开访问URL
 */
export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    console.log('开始上传文件到MinIO:', { objectName, contentType, size: buffer.length })

    const client = getMinioClient()

    // 确保桶存在（带缓存，只检查一次）
    await ensureBucketExists()

    // 上传文件
    console.log('正在上传文件...')
    await client.putObject(
      minioConfig.bucket,
      objectName,
      buffer,
      buffer.length,
      { 'Content-Type': contentType }
    )
    console.log('文件上传成功:', objectName)

    // 返回公开URL
    const protocol = minioConfig.useSSL ? 'https' : 'http'
    const host = minioConfig.publicUrl || `${minioConfig.endPoint}:${minioConfig.port}`
    const publicUrl = `${protocol}://${host}/${minioConfig.bucket}/${objectName}`

    console.log('生成的公开URL:', publicUrl)

    return publicUrl
  } catch (error) {
    console.error('MinIO上传失败:', error)
    throw error
  }
}

/**
 * 从MinIO删除文件
 * @param objectName 对象名称（文件路径）
 */
export async function deleteFile(objectName: string): Promise<void> {
  const client = getMinioClient()

  try {
    await client.removeObject(minioConfig.bucket, objectName)
  } catch (error) {
    console.error('Error deleting file from MinIO:', error)
    throw error
  }
}

/**
 * 从完整URL中提取对象名称
 * @param url 完整的文件URL
 * @returns 对象名称（文件路径）
 */
export function extractObjectName(url: string): string | null {
  try {
    // 例如: https://minio.example.com/user-uploads/avatars/user_123.jpg
    // 需要提取出: avatars/user_123.jpg

    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)

    // 找到bucket名称后的路径
    const bucketIndex = pathParts.indexOf(minioConfig.bucket)
    if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
      return pathParts.slice(bucketIndex + 1).join('/')
    }

    // 如果没有bucket名称，假设路径是 /bucket-name/object-name 格式
    if (pathParts.length >= 2) {
      return pathParts.slice(1).join('/')
    }

    return null
  } catch (error) {
    console.error('Error extracting object name:', error)
    return null
  }
}

/**
 * 检查URL是否为MinIO URL
 * @param url 文件URL
 * @returns 是否为MinIO管理的URL
 */
export function isMinioUrl(url: string): boolean {
  if (!url) return false

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    // 检查是否匹配配置的MinIO地址
    const minioHost = minioConfig.publicUrl
      ? new URL(minioConfig.useSSL ? 'https://' : 'http://' + minioConfig.publicUrl).hostname
      : minioConfig.endPoint

    return hostname === minioHost || url.includes(minioConfig.bucket)
  } catch {
    return false
  }
}

export { minioConfig, getMinioClient, ensureBucketExists }
