import { Injectable } from '@nestjs/common';
import type { UserDTO } from '@app/shared';
import { PrismaService } from '@/prisma/prisma.service';
import { mapUserToDTO } from './user.mapper';

/**
 * 分页/查询参数。
 *
 * 未传 page/pageSize 时走“全量查询”分支，保持与旧接口的兼容行为。
 */
export interface FindUsersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: FindUsersOptions): Promise<UserDTO[]> {
    const { page, pageSize, search } = options ?? {};

    if (typeof page === 'number' && typeof pageSize === 'number') {
      const offset = (page - 1) * pageSize;
      let collection = this.prisma.orm.User.select('id', 'email', 'created_at', 'updated_at');

      if (search) {
        collection = collection.where((u) => u.email.like(`%${search}%`));
      }

      const users = await collection.limit(pageSize).offset(offset).all();
      return users.map(mapUserToDTO);
    }

    let collection = this.prisma.orm.User.select('id', 'email', 'created_at', 'updated_at');
    if (search) {
      collection = collection.where((u) => u.email.like(`%${search}%`));
    }
    const users = await collection.all();
    return users.map(mapUserToDTO);
  }
}
