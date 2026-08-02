/**
 * 业务错误码枚举。
 *
 * 前后端共享，前后端引同一份，避免魔法数字。
 * 分段约定见 api-response.ts：
 *   10000–10099 通用
 *   10100–10199 认证/授权
 *   20000–20099 短链
 *   20100–20199 用户
 *
 * HTTP 状态码不进此枚举，它们走 HttpError.status。
 */
export const ErrorCode = {
  // ---------- 通用 10000–10099 ----------
  INTERNAL: 10000,
  INVALID_PARAMS: 10001,
  NOT_FOUND: 10002,

  // ---------- 认证/授权 10100–10199 ----------
  AUTH_INVALID_CREDENTIALS: 10100,
  AUTH_TOKEN_EXPIRED: 10101,
  AUTH_TOKEN_INVALID: 10102,
  AUTH_FORBIDDEN: 10103,

  // ---------- 短链 20000–20099 ----------
  LINK_NOT_FOUND: 20000,
  LINK_EXPIRED: 20001,
  LINK_DUPLICATE: 20002,

  // ---------- 用户 20100–20199 ----------
  USER_NOT_FOUND: 20100,
  USER_EMAIL_EXISTS: 20101,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];