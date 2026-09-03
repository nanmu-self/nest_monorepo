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
  // Prisma 8 的 timestamptz codec 返回 Temporal.Instant（v7 是 Date）。
  // TS 5.8 的 lib 尚无 Temporal 类型，用最小结构类型表达。
  created_at: { toString(): string };
  updated_at: { toString(): string };
};

const toIso = (value: { toString(): string }): string => value.toString();

export function mapUserToDTO(user: PrismaUser): UserDTO {
  return {
    id: user.id,
    email: user.email,
    // Temporal.Instant.toString() 即 ISO 8601（UTC），与 API 契约一致
    created_at: toIso(user.created_at),
    updated_at: toIso(user.updated_at),
  };
}
