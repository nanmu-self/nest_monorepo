import type { UserListDTO } from '@app/shared';
import { http } from '@/lib/http';

/**
 * 用户列表查询参数。
 *
 * 与后端 `QueryUsersDto` 对齐：page / pageSize 分页（必传），search 邮箱模糊过滤。
 */
export interface GetUsersParams {
  page: number;
  pageSize: number;
  search?: string;
}

/**
 * 获取用户列表（分页）。
 *
 * 后端返回 `{ list, total }`：total 是满足过滤条件的总数，用于计算真实总页数。
 */
export function getUsers({ page, pageSize, search }: GetUsersParams) {
  const queryParts = [`page=${page}`, `pageSize=${pageSize}`];
  if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
  return http.Get<UserListDTO>(`/users?${queryParts.join('&')}`);
}
