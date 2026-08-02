import { Injectable } from '@nestjs/common';
import type { UserDTO } from '@short-link/shared';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserDTO[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    });
    // Prisma 返回 Date，API 契约约定 ISO string（JSON wire format）
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at.toISOString(),
      updated_at: u.updated_at.toISOString(),
    }));
  }
}
