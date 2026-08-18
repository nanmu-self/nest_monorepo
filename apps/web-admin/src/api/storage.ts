import type { UploadTokenResponse } from '@app/shared';
import { http } from '@/lib/http';

/**
 * 签发七牛上传凭证（客户端直传）。
 *
 * @param key   指定文件 key（可选，省略则由七牛自动生成）
 * @param expires 凭证有效期（秒，可选）
 */
export function createUploadToken(key?: string, expires?: number) {
  return http.Post<UploadTokenResponse>('/qiniu/upload-token', {
    ...(key !== undefined && { key }),
    ...(expires !== undefined && { expires }),
  });
}

/**
 * 删除七牛存储空间中的文件。
 *
 * @param key 文件 key，也可传入完整访问 URL（后端自动解析）
 */
export function deleteFile(key: string) {
  return http.Delete<void>(`/qiniu/files?key=${encodeURIComponent(key)}`);
}
