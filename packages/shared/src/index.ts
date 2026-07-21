/**
 * `@short-link/shared` 根入口 -- 仅导出与运行时框架无关的类型/工具。
 *
 * 需要 alova HTTP 客户端，请从 `@short-link/shared/http` 引入，
 * 避免服务端应用被拉入前端专用依赖。
 */
export { HttpError } from './errors';
export type { UserDTO, LoginRequest, LoginResponse, ApiResponse } from './contracts';
