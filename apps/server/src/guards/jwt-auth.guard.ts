import { Injectable, ExecutionContext, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ErrorCode } from '@app/shared';
import { BizException } from '@/common/biz-exception';

/**
 * JWT 认证守卫。
 *
 * 使用 @UseGuards(JwtAuthGuard) 装饰器保护路由。
 * 验证通过后，Request.user 会包含用户信息 { id, email }。
 *
 * 三种失败各自携带独立业务码，让客户端能区分“凭证过期可静默续期”、
 * “Token 被篡改需告警”与“未携带凭证”，而不是都看到一个笼统的 401。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    _context: ExecutionContext,
  ): TUser {
    // Token 过期
    if (info instanceof TokenExpiredError) {
      throw new BizException(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        '登录已过期，请重新登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Token 无效（签名不匹配、格式错误等）
    if (info instanceof JsonWebTokenError) {
      throw new BizException(
        ErrorCode.AUTH_TOKEN_INVALID,
        '登录凭证无效，请重新登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 其他认证错误（未携带 Token、策略返回空用户等）
    if (err || !user) {
      throw new BizException(ErrorCode.AUTH_TOKEN_INVALID, '请先登录', HttpStatus.UNAUTHORIZED);
    }

    return user;
  }
}
