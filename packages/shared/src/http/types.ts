import type { StatesHook } from 'alova';
import type { HttpError } from '../errors';

/**
 * HTTP 模块选项类型（不含运行时依赖）。
 */

export type { StatesHook };

/** 创建 HTTP 实例的配置 */
export interface CreateHttpOptions {
  /** API 基础路径，如 `/api/v1` */
  baseURL: string;
  /**
   * alova 的 states hook 适配层。
   *
   * - React：`import ReactHook from 'alova/react'`
   * - Vue：`import VueHook from 'alova/vue'`
   *
   * 由调用方注入，避免 shared 包硬编码某个前端框架。
   */
  statesHook: StatesHook<any>;
  /** 请求超时（毫秒），默认 30000 */
  timeout?: number;
  /** 获取认证 token，返回值会注入到 Authorization: Bearer <token> 头 */
  getToken?: () => string | null | undefined;
  /** 401 未授权时的回调（如清除 token、跳转登录页） */
  onUnauthorized?: () => void;
  /** 全局错误回调，所有请求异常都会经过这里 */
  onError?: (error: HttpError) => void;
}
