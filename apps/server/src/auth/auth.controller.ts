import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import type { LoginRequest, LoginResponse, UserDTO } from '@short-link/shared';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

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
   */
  @Post('login')
  async login(@Body() body: LoginRequest): Promise<LoginResponse> {
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
