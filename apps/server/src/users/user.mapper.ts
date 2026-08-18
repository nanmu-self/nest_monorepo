import type { UserDTO } from '@app/shared';

/**
 * Prisma User 模型 -> API DTO。
 *
 * 集中映射避免在 AuthService 和 UsersService 各写一份、字段漂移。
 * Prisma 返回 Date，API 契约约定 ISO string（JSON wire format）。
 */
type PrismaUser = {
  id: number;
  email: string;
  created_at: Date;
  updated_at: Date;
};

export function mapUserToDTO(user: PrismaUser): UserDTO {
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  };
}
