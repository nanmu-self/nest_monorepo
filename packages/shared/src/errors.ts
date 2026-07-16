/**
 * 统一 HTTP 错误，前后端共享的错误形状。
 *
 * - `status = 0` 约定为网络错误（fetch 本身失败）
 * - `status >= 400` 为服务端返回的业务错误
 * - `data` 保留服务端原始响应体，便于业务侧读取自定义字段
 */
export class HttpError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
}
