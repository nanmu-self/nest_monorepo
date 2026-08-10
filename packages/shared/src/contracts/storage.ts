/**
 * 对象存储相关的 API 契约类型。
 *
 * 这些接口描述的是 API 响应的 wire format（JSON）。
 * 字段为 snake_case，与 @short-link/shared 的其他契约保持一致。
 */

/**
 * 上传凭证响应（供客户端直传使用）。
 *
 * 客户端拿到 token 后用 qiniu-js SDK 直接上传到七牛，
 * 不再经过业务后端中转，减少后端带宽与内存压力。
 */
export interface UploadTokenResponse {
  /** 七牛上传凭证，SDK upload() 的 token 参数 */
  token: string;
  /** 目标存储空间名 */
  bucket: string;
  /** 文件访问域名（公开空间直接拼接 key 即可访问） */
  domain: string;
  /** 凭证有效期（秒） */
  expires_in: number;
  /**
   * 存储区域标识，传给 qiniu-js 的 config.region：
   * z0(华东) | z1(华北) | z2(华南) | na0(北美) | as0(东南亚) | cn-east-2(华东2)
   * 前端无需单独配置区域，从后端统一获取，避免前后端不一致。
   */
  region: string;
  /**
   * 服务端指定 key 时，客户端必须用此 key 上传；
   * 省略表示由七牛自动生成 key。
   */
  key?: string;
}
