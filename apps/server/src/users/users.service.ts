import { Injectable } from '@nestjs/common';
import type { UserDTO, UserListDTO } from '@app/shared';
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

  async findAll(options?: FindUsersOptions): Promise<UserDTO[] | UserListDTO> {
    const { page, pageSize, search } = options ?? {};

    if (typeof page === 'number' && typeof pageSize === 'number') {
      const offset = (page - 1) * pageSize;

      // 数据行（当前页，含业务列）
      let dataCollection = this.prisma.orm.User.select('id', 'email', 'created_at', 'updated_at');
      // 计数行（仅 id 列，避免为计数搬运整行数据）
      let countCollection = this.prisma.orm.User.select('id');
      if (search) {
        dataCollection = dataCollection.where((u) => u.email.like(`%${search}%`));
        countCollection = countCollection.where((u) => u.email.like(`%${search}%`));
      }

      const users = await dataCollection.limit(pageSize).offset(offset).all();
      // PSL 8 的 count() 聚合目前仅能在 include() 回调内使用（见 @prisma/orm-family-sql
      // 的 orm-client.d.mts：CollectionImpl 无顶层 count/aggregate 终端），
      // 这里退化为「取符合条件的主键列表后计长」。后台管理量级可接受；
      // 若表规模上来，优先在契约层暴露 count 聚合能力。
      const total = (await countCollection.all()).length;
      return { list: users.map(mapUserToDTO), total };
    }

    let collection = this.prisma.orm.User.select('id', 'email', 'created_at', 'updated_at');
    if (search) {
      collection = collection.where((u) => u.email.like(`%${search}%`));
    }
    const users = await collection.all();
    return users.map(mapUserToDTO);
  }
}
