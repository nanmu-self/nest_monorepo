/**
 * 统一 HTTP 错误，前后端共享的错误形状。
 *
 * - `status = 0` 约定为网络错误（fetch 本身失败）
 * - `status >= 400` 为服务端返回的 HTTP 错误
 * - `bizCode` 为业务错误码（>= 10000），从响应体 `{ code }` 中提取；
 *   HTTP 错误（code 为 4xx/5xx）时为 undefined
 * - `data` 保留服务端原始响应体，便于业务侧读取自定义字段
 */
export class HttpError extends Error {
  readonly status: number;
  readonly bizCode?: number;
  readonly data: unknown;

  constructor(status: number, message: string, data?: unknown, bizCode?: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
    this.bizCode = bizCode;
  }
}
