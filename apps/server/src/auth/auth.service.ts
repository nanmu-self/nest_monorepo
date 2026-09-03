import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { UserDTO, LoginRequest, LoginResponse } from '@app/shared';
import { ErrorCode } from '@app/shared';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { PrismaService } from '@/prisma/prisma.service';
import { BizException } from '@/common/biz-exception';
import { mapUserToDTO } from '@/users/user.mapper';
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
    const user = await this.prisma.orm.where({ email: data.email as Varchar<128> }).first();

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
      user: mapUserToDTO(user),
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
    const user = await this.prisma.orm.first({ id: userId });

    if (!user) {
      throw new BizException(
        ErrorCode.USER_NOT_FOUND,
        '账号不存在或已被注销，请重新登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return mapUserToDTO(user);
  }
}
