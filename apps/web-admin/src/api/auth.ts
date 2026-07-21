import type { LoginRequest, LoginResponse, UserDTO } from '@short-link/shared';
import { http } from '@/lib/http';

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
 * 退出登录
 */
export function logout() {
  localStorage.removeItem('token');
  // 触发页面跳转由调用方处理
}
