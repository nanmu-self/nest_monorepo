import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { LoginResponse, UserDTO } from '@short-link/shared';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

/**
 * 认证相关接口。
 *
 * 登录接口公开，其他接口需 JWT Token 认证。
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户登录
   *
   * 限流：单 IP 每分钟最多 5 次，防止密码暴力破解。
   */
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.authService.login(body);
  }

  /**
   * 获取当前登录用户信息
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: { user: { id: number } }): Promise<UserDTO> {
    return this.authService.getProfile(req.user.id);
  }
}
