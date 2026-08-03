import { HttpException, HttpStatus } from '@nestjs/common';

/** 业务码下限：低于此值会与 HTTP 状态码命名空间冲突 */
const BIZ_CODE_MIN = 10000;

/**
 * BizException 的响应体形状，与统一封套一致。
 */
interface BizExceptionPayload {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * 构造响应体，并在构造实例之前校验业务码。
 *
 * 校验放在 super() 的实参位置求值，因此非法业务码在对象产生前就抛错，
 * 不会留下一个 payload 已写入、字段却未初始化的半成品实例。
 */
function buildPayload(bizCode: number, message: string, details?: unknown): BizExceptionPayload {
  if (!Number.isInteger(bizCode) || bizCode < BIZ_CODE_MIN) {
    throw new Error(
      `BizException bizCode 必须是 >= ${BIZ_CODE_MIN} 的整数（收到 ${bizCode}），以避免与 HTTP 状态码冲突`,
    );
  }
  return {
    code: bizCode,
    message,
    ...(details !== undefined && { data: details }),
  };
}

/**
 * 业务异常。
 *
 * 用于携带 5 位业务错误码（>= 10000）与对应的 HTTP 状态码。
 *
 * 继承自 HttpException，因此：
 *   - 任意捕获 HttpException 的路由级/模块级 filter 都能识别它，
 *     `getStatus()` 返回 httpStatus，不会漏成 500；
 *   - AllExceptionFilter 通过 instanceof BizException 优先分支
 *     将其封套为 `{ code: bizCode, message, data? }`，HTTP 状态由 header 表达。
 *
 * 单一真理源：业务码与详情只存在于 `getResponse()` 的 payload 中，
 * `bizCode` / `details` 是从它派生的 getter，不额外存实例字段，
 * 因此不存在两份数据漂移的可能。覆写 `getResponse()` 时必须保持
 * `{ code, message, data? }` 形状；若形状被破坏，getter 返回 undefined，
 * AllExceptionFilter 会退回用 HTTP 状态码作为响应体的 code。
 *
 * 业务码分段见 packages/shared/src/contracts/api-response.ts。
 */
export class BizException extends HttpException {
  constructor(
    bizCode: number,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    // payload 采用统一封套形状，使仅识别 HttpException 的过滤器也能拿到业务码
    super(buildPayload(bizCode, message, details), httpStatus);
    this.name = 'BizException';
  }

  /** 从 payload 派生的业务码；payload 形状被覆写破坏时为 undefined */
  get bizCode(): number | undefined {
    const payload = this.getResponse();
    if (typeof payload === 'object' && payload !== null) {
      const code = (payload as Record<string, unknown>).code;
      if (typeof code === 'number') return code;
    }
    return undefined;
  }

  /** 从 payload 派生的错误详情 */
  get details(): unknown {
    const payload = this.getResponse();
    if (typeof payload === 'object' && payload !== null) {
      return (payload as Record<string, unknown>).data;
    }
    return undefined;
  }
}
