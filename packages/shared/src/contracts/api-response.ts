/**
 * 统一成功响应封套。
 *
 * server 端 TransformInterceptor 会把所有 controller 返回值包成此形状，
 * 前端 createHttp 的 onSuccess 会解封套取出 data。
 *
 * 错误响应不走此封套，保持 NestJS 默认 `{ statusCode, message, error }`。
 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码，0 表示成功 */
  code: number;
  /** 业务数据 */
  data: T;
  /** 人类可读的消息，成功时为 'ok' */
  message: string;
}
