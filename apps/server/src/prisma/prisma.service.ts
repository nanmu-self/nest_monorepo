import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import postgres from '@prisma/orm-postgres/runtime';
import type { PostgresClient } from '@prisma/orm-postgres/runtime';
import type { Contract } from '../../prisma/contract';
import contractJson from '../../prisma/contract.json';
import { DATABASE_URL } from '@/config/env';

/**
 * Prisma 8 数据库服务。
 *
 * Prisma 8 不再生成 PrismaClient 类，取而代之的是 `@prisma/orm-postgres`
 * runtime 的 `postgres()` 工厂：传入 contract.json + contract 类型，
 * 得到的客户端直接暴露 `.orm`（模型查询）与 `.sql`（类型化 SQL builder）。
 *
 * 与 Prisma 7 的差异：
 *   - 不再有 adapter（@prisma/adapter-pg），连接由 runtime 内部管理；
 *   - 日志配置（log: ['query', ...]）不复存在，查询级观测改用 middleware；
 *   - onModuleInit 里显式 connect()，onModuleDestroy 里 close()。
 *
 * 查询写法示例（原来是 prisma.user.findUnique）：
 *   this.orm.public.User.where({ email }).first()
 *   this.orm.public.User.select('id', 'email').all()
 *
 * 注意：Collection 是链式构造器，终端方法是 .all() / .first() 等，
 * 不是 Prisma 7 的 .findMany() / .findFirst()。
 * count()/sum() 等聚合只能出现在 include() 回调内（对 to-many 关系归约），
 * 顶层集合没有 count 终端；分组聚合走 .groupBy(...).aggregate(...)。
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PostgresClient<Contract> = postgres<Contract>({
    contractJson,
    url: DATABASE_URL,
  });

  /** 模型查询入口（等价于 Prisma 7 的 prisma.public.*） */
  get orm(): PostgresClient<Contract>['orm']['public'] {
    return this.client.orm.public;
  }

  onModuleInit(): Promise<unknown> {
    // 打开连接池；查询在签名校验通过后即可执行
    return this.client.connect();
  }

  onModuleDestroy(): Promise<void> {
    return this.client.close();
  }

  /** 健康检查用 ping：挑最便宜的一条查询验证连通性 */
  async ping() {
    await this.client.runtime().execute(this.client.sql.public.users.select('id').limit(1).build());
  }
}
