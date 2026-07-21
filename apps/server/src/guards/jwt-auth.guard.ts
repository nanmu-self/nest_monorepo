import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * JWT 认证守卫。
 *
 * 使用 @UseGuards(JwtAuthGuard) 装饰器保护路由。
 * 验证通过后，Request.user 会包含用户信息 { id, email }。
 *
 * 对不同的 Token 错误返回更友好的提示消息。
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
      throw new UnauthorizedException('Token has expired');
    }

    // Token 无效
    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid token');
    }

    // 其他认证错误
    if (err || !user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return user;
  }
}
