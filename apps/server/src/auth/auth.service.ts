import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { UserDTO, LoginRequest, LoginResponse } from '@short-link/shared';
import { ErrorCode } from '@short-link/shared';
import { PrismaService } from '@/prisma/prisma.service';
import { BizException } from '@/common/biz-exception';
import { JWT_EXPIRES_IN } from '@/config/env';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 用户登录验证
   *
   * 用户不存在与密码错误返回完全相同的错误码与文案，
   * 避免通过响应差异枚举已注册邮箱。
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new BizException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        '邮箱或密码错误！',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 验证密码
    const passwordValid = await bcrypt.compare(data.password, user.password_hash);

    if (!passwordValid) {
      throw new BizException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        '邮箱或密码错误！',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 生成 JWT Token，secret 与 expiresIn 已由全局 JwtModule 提供
    const access_token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      access_token,
      user: this.toUserDTO(user),
      expires_in: JWT_EXPIRES_IN,
    };
  }

  /**
   * 获取当前登录用户信息
   *
   * JWT 已过签却查不到用户，说明账号在签发后被删除。
   * 此时返回 401（而非 Prisma P2025 映射出的 404），
   * 让客户端能明确区分“凭证已失效，需重新登录”与“接口临时故障”。
   */
  async getProfile(userId: number): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BizException(
        ErrorCode.USER_NOT_FOUND,
        '账号不存在或已被注销，请重新登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.toUserDTO(user);
  }

  /**
   * 创建用户（密码自动哈希）
   */
  async createUser(data: { email: string; password: string }) {
    const password_hash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password_hash,
      },
    });
  }

  private toUserDTO(user: {
    id: number;
    email: string;
    created_at: Date;
    updated_at: Date;
  }): UserDTO {
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    };
  }
}