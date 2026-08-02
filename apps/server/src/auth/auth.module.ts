import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JWT_SECRET, JWT_EXPIRES_IN } from '@/config/env';

/**
 * 认证模块。
 *
 * 提供 JWT 认证、登录接口、用户信息查询功能。
 * JWT_SECRET 由 @/config/env 在启动时强制校验，缺失或过短直接崩溃。
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}