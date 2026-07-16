/**
 * `@short-link/shared/http` —— alova HTTP 客户端。
 *
 * 拆分为独立 subpath，避免不需要前端 HTTP 客户端的消费方（如 Nest 服务端）
 * 被间接拉入 alova / React 相关依赖。
 */
export { createHttp } from './create-http';
export type { CreateHttpOptions, StatesHook } from './types';
export { HttpError } from '../errors';
