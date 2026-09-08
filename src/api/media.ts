import client, { Result } from './client'

export interface MediaUploadResult {
  /** 相对 URL（/media/...），可直接作为封面图地址。 */
  url: string
  size: number
  contentType?: string
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const mediaApi = {
  /**
   * 上传内容图片（封面图等）。仅支持 JPG/PNG/WebP，≤5MB。
   * 429 时向调用方抛出带 retryAfterSeconds 的错误，由页面统一提示。
   */
  uploadImage: async (file: File): Promise<Result<MediaUploadResult>> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('仅支持 JPG/PNG/WebP 图片')
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('图片不能超过 5MB')
    }
    const form = new FormData()
    form.append('file', file)
    return client.post('/api/v1/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000,
    })
  },
}
