/**
 * 文件相关 API
 */

import { uploadFile } from '../client'

/**
 * 文件上传响应
 */
export interface FileUploadResponse {
  url: string
  fileName: string
}

/**
 * 上传单个文件
 */
export async function uploadSingleFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<FileUploadResponse> {
  return uploadFile('/api/upload', file, onProgress)
}

/**
 * 上传头像
 */
export async function uploadAvatar(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await uploadFile('/api/upload/avatar', file, onProgress)
  return result.url
}
