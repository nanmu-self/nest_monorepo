import type { LoginRequest, LoginResponse, UserDTO } from '@app/shared';
import { http } from '@/lib/http';
import { auth } from '@/lib/auth';

/**
 * 用户登录
 */
export function login(data: LoginRequest) {
  return http.Post<LoginResponse>('/auth/login', data);
}

/**
 * 获取当前用户信息
 */
export function getProfile() {
  return http.Get<UserDTO>('/auth/profile');
}

/**
 * 退出登录：清 token，跳转由调用方处理
 */
export function logout() {
  auth.clear();
}
