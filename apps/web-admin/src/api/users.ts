import type { UserDTO } from '@app/shared';
import { http } from '@/lib/http';

/**
 * 用户列表查询参数。
 *
 * 与后端 `QueryUsersDto` 对齐：page / pageSize 分页，search 邮箱模糊过滤。
 */
export interface GetUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * 获取用户列表。
 *
 * 不传分页参数时返回全部数据（保留旧行为）。
 */
export function getUsers(params?: GetUsersParams) {
  const { page, pageSize, search } = params ?? {};

  const queryParts: string[] = [];
  if (typeof page === 'number') queryParts.push(`page=${page}`);
  if (typeof pageSize === 'number') queryParts.push(`pageSize=${pageSize}`);
  if (search) queryParts.push(`search=${encodeURIComponent(search)}`);

  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return http.Get<UserDTO[]>(`/users${query}`);
}
