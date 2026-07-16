import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';

import { HttpError } from '../errors';
import type { CreateHttpOptions } from './types';

/**
 * 从响应体中提取错误信息。
 * 兼容 NestJS 默认错误格式 `{ statusCode, message, error }`。
 */
function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const msg = (body as Record<string, unknown>).message;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
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
export function createHttp(options: CreateHttpOptions) {
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
        // 401: 未授权，触发回调（如跳转登录）
        if (response.status === 401) {
          options.onUnauthorized?.();
        }

        // 非 2xx：解析错误体并抛出 HttpError
        if (!response.ok) {
          let body: unknown;
          try {
            body = await response.json();
          } catch {
            body = undefined;
          }
          const message = extractErrorMessage(body) ?? response.statusText;
          const error = new HttpError(response.status, message, body);
          options.onError?.(error);
          throw error;
        }

        // 2xx：返回解析后的 JSON 数据
        return response.json();
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
