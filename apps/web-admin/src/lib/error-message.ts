import { ErrorCode, HttpError } from '@app/shared';

/**
 * 业务错误码 -> 界面文案。
 *
 * 只登记需要覆盖服务端文案的码：
 * 服务端文案面向 API 消费者，此处按界面语境改写（更短、可操作）。
 * 未登记的码直接沿用服务端 message，避免每加一个码都要改前端。
 */
const BIZ_CODE_MESSAGES: Partial<Record<number, string>> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: '邮箱或密码错误，请重新输入',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorCode.AUTH_TOKEN_INVALID]: '登录状态异常，请重新登录',
  [ErrorCode.USER_NOT_FOUND]: '账号不存在或已被注销',
};

/**
 * 把任意异常解析为可展示给用户的文案。
 *
 * 优先级：业务码映射 > 状态码兜底 > 服务端 message > fallback。
 *
 * 状态码优先于 message：网络错误（status=0）的 message 是英文
 * "Failed to fetch"，5xx 的 message 可能是内部堆栈原文，都不可直接
 * 展示给用户，必须先转成中文兜底文案；只有状态码不属于这两类时
 * 才回落到服务端 message。
 *
 * 业务码映射仍是最优先：新增一个码只需在 BIZ_CODE_MESSAGES 里登记，
 * 而不是在各个 catch 分支里堆 if。
 *
 * @param err 捕获到的未知异常
 * @param fallback 无法识别时的兜底文案
 */
export function resolveErrorMessage(err: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!(err instanceof HttpError)) {
    return fallback;
  }

  // 业务码有专门文案时优先使用
  if (err.bizCode !== undefined) {
    const mapped = BIZ_CODE_MESSAGES[err.bizCode];
    if (mapped) return mapped;
  }

  // status 0 是约定的网络错误（fetch 本身失败）
  if (err.status === 0) {
    return '网络连接失败，请检查网络后重试';
  }

  if (err.status >= 500) {
    return '服务暂时不可用，请稍后重试';
  }

  // 服务端已给出可读消息（4xx 多数有可读 message）
  if (err.message) {
    return err.message;
  }

  return fallback;
}

/**
 * 判断错误是否为指定业务码，供调用方做分支（如聚焦某个表单字段）。
 */
export function isBizCode(err: unknown, code: number): boolean {
  return err instanceof HttpError && err.bizCode === code;
}
