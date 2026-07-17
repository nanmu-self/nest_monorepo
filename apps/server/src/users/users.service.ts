import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // 排除 password_hash,避免敏感字段泄漏
    return this.prisma.users.findMany({
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    });
  }
}
