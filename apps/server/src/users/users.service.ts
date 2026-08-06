import { Injectable } from '@nestjs/common';
import type { UserDTO } from '@short-link/shared';
import { PrismaService } from '@/prisma/prisma.service';
import { mapUserToDTO } from './user.mapper';

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
    return users.map(mapUserToDTO);
  }
}
