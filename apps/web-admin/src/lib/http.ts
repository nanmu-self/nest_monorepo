import ReactHook from 'alova/react';
import { createHttp } from '@app/shared/http';
import { auth } from '@/lib/auth';

/**
 * 后台管理应用的共享 Alova 实例。
 *
 * baseURL 默认走 Vite proxy（/api -> server），
 * 生产环境可通过 VITE_API_BASE_URL 覆盖。
 */
export const http = createHttp({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  statesHook: ReactHook,
  getToken: auth.getToken,
  onUnauthorized: auth.handleUnauthorized,
});
