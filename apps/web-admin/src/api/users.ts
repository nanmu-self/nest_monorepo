import type { UserDTO } from '@app/shared';
import { http } from '@/lib/http';

/** 获取用户列表 */
export const getUsers = () => http.Get<UserDTO[]>('/users');
