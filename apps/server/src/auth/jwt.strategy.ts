import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET } from '@/config/env';

/**
 * JWT 策略配置。
 *
 * 从 Authorization: Bearer <token> 头提取 Token，
 * 使用 JWT_SECRET 验证签名，验证通过后将 payload
 * 挂载到 Request.user 上。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  /**
   * 验证通过后调用，返回值会被挂载到 Request.user
   */
  validate(payload: { sub: number; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}