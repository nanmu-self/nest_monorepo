import { Injectable } from '@nestjs/common';
import type { UserDTO } from '@app/shared';
import { PrismaService } from '@/prisma/prisma.service';
import { mapUserToDTO } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserDTO[]> {
    const users = await this.prisma.orm.select('id', 'email', 'created_at', 'updated_at').all();
    return users.map(mapUserToDTO);
  }
}
