import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // 排除 password_hash,避免敏感字段泄漏
    return this.prisma.admins.findMany({
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        status: true,
        last_login_at: true,
        last_login_ip: true,
        created_at: true,
        updated_at: true,
      },
    });
  }
}
