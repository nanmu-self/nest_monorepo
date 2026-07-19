/**
 * 用户相关的 API 契约类型。
 *
 * 这些接口描述的是 API 响应的 wire format（JSON），
 * 而非 Prisma 模型。Date 在 JSON 序列化后为 ISO string。
 */

/** 用户信息（不含密码等敏感字段） */
export interface UserDTO {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
}
