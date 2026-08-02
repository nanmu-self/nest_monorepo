/**
 * 统一响应封套契约。
 *
 * server 端 TransformInterceptor 会把所有 controller 返回值包成此形状，
 * 前端 createHttp 的 onSuccess 会解封套取出 data。
 *
 * 错误响应由 AllExceptionFilter 统一封套为同形 `{ code, message, data? }`。
 *
 * code 命名空间约定：
 *   - 0            成功
 *   - 1xx–599      HTTP/传输层错误，值等于 HTTP 状态码（400/401/404/500 ...）
 *   - >= 10000     业务错误码（5 位，按模块分段，永不与 HTTP 状态码冲突）
 *
 * 业务错误码分段建议：
 *   10000–10099 通用（参数校验、内部错误）
 *   10100–10199 认证/授权
 *   20000–20099 短链
 *   20100–20199 用户
 *   ...
 */
export interface ApiResponse<T = unknown> {
  /** 状态码，命名空间见文件头说明 */
  code: number;
  /** 业务数据 */
  data: T;
  /** 人类可读的消息，成功时为 'ok' */
  message: string;
}