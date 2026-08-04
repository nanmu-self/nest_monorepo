import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';
import type { StatesExport } from 'alova';

import { HttpError } from '../errors';
import { ErrorCode } from '../constants/error-codes';
import type { ApiResponse } from '../contracts';
import type { CreateHttpOptions } from './types';

/**
 * 不触发全局跳转的 401 业务码白名单。
 *
 * 语义：「用户主动提交凭证但验证失败」——此时用户就在登录页，
 * 跳转会冲掉页面上刚渲染的错误提示，用户只看到页面闪一下。
 *
 * 除此之外的所有 401（token 过期/无效、账号被注销、未携带凭证）
 * 都意味着“当前会话不可用”，必须清 token 并跳登录页。
 * 新增认证类业务码时，只有属于前一类才加进这里。
 */
const UNAUTHORIZED_EXEMPT_BIZ_CODES = new Set<number>([ErrorCode.AUTH_INVALID_CREDENTIALS]);

/**
 * 判定 401 是否应触发 onUnauthorized（清 token + 跳登录页）。
 */
function shouldTriggerUnauthorized(body: unknown): boolean {
  const bizCode = extractBizCode(body);
  // 无业务码的 401（如 Nest 默认 UnauthorizedException）一律跳转
  if (bizCode === undefined) return true;
  return !UNAUTHORIZED_EXEMPT_BIZ_CODES.has(bizCode);
}

/**
 * 从响应体中提取错误信息。
 * 兼容统一封套 `{ code, message, data? }` 以及其他含 message 字段的错误体。
 */
function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const msg = (body as Record<string, unknown>).message;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
}

/**
 * 从响应体中提取业务码（>= 10000）。
 * HTTP 错误码（4xx/5xx）不是业务码，返回 undefined。
 */
function extractBizCode(body: unknown): number | undefined {
  if (typeof body === 'object' && body !== null && 'code' in body) {
    const code = (body as Record<string, unknown>).code;
    if (typeof code === 'number' && code >= 10000) {
      return code;
    }
  }
  return undefined;
}

/**
 * 判断响应体是否为标准封套 `{ code, data, message }`。
 */
function isApiResponse(body: unknown): body is ApiResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    'data' in body &&
    'message' in body
  );
}

/**
 * 创建共享的 Alova HTTP 实例。
 *
 * 封装了 token 注入、统一错误处理、401 拦截等通用逻辑，
 * 各 app 只需提供自己的 baseURL、statesHook、token 来源和错误回调即可。
 *
 * @example
 * ```ts
 * import ReactHook from 'alova/react';
 * import { createHttp } from '@short-link/shared/http';
 *
 * export const http = createHttp({
 *   baseURL: '/api/v1',
 *   statesHook: ReactHook,
 *   getToken: () => localStorage.getItem('token'),
 *   onUnauthorized: () => {
 *     localStorage.removeItem('token');
 *     window.location.href = '/login';
 *   },
 * });
 * ```
 */
export function createHttp<SE extends StatesExport<any> = StatesExport<any>>(
  options: CreateHttpOptions<SE>,
) {
  return createAlova({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 30_000,
    requestAdapter: adapterFetch(),
    statesHook: options.statesHook,

    beforeRequest(method) {
      const token = options.getToken?.();
      if (token) {
        method.config.headers = {
          ...method.config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    },

    responded: {
      async onSuccess(response) {
        // 非 2xx：解析错误体并抛出 HttpError
        if (!response.ok) {
          let body: unknown;
          try {
            body = await response.json();
          } catch {
            body = undefined;
          }

          // 401 需在解析 body 之后判定：登录凭证错误也是 401，
          // 但不应触发跳转（见 shouldTriggerUnauthorized）
          if (response.status === 401 && shouldTriggerUnauthorized(body)) {
            options.onUnauthorized?.();
          }

          const message = extractErrorMessage(body) ?? response.statusText;
          const error = new HttpError(response.status, message, body, extractBizCode(body));
          options.onError?.(error);
          throw error;
        }

        // 2xx：解析 JSON，解封套 { code: 0, data: T, message: 'ok' }
        const body = await response.json();

        // 标准封套：code === 0 取 data；code 非 0 视为业务错误
        if (isApiResponse(body)) {
          if (body.code === 0) {
            return body.data;
          }
          const message = body.message || 'Business Error';
          const error = new HttpError(response.status, message, body, extractBizCode(body));
          options.onError?.(error);
          throw error;
        }

        // 非标准封套（如健康检查、第三方代理）：原样返回
        return body;
      },

      onError(error) {
        // 网络错误（fetch 本身失败，如断网、DNS 解析失败等）
        const httpError = new HttpError(0, error.message ?? 'Network Error');
        options.onError?.(httpError);
        throw httpError;
      },
    },
  });
}
