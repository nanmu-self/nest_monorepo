import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { UserDTO, LoginRequest, LoginResponse } from '@short-link/shared';
import { PrismaService } from '@/prisma/prisma.service';

const JWT_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 天

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 用户登录验证
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // 查找用户
    const user = await this.prisma.users.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 验证密码
    const passwordValid = await bcrypt.compare(data.password, user.password_hash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 生成 JWT Token
    const access_token = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
      },
      {
        expiresIn: JWT_EXPIRES_IN,
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      },
    );

    return {
      access_token,
      user: this.toUserDTO(user),
      expires_in: JWT_EXPIRES_IN,
    };
  }

  /**
   * 获取当前登录用户信息
   */
  async getProfile(userId: number): Promise<UserDTO> {
    const user = await this.prisma.users.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toUserDTO(user);
  }

  /**
   * 创建用户（密码自动哈希）
   */
  async createUser(data: { email: string; password: string }) {
    const password_hash = await bcrypt.hash(data.password, 10);
    return this.prisma.users.create({
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
