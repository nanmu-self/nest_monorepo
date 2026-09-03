/**
 * 数据库种子脚本。
 *
 * 跑法：
 *   cd apps/server
 *   pnpm db:seed
 *
 * Prisma 7 时代由 prisma.config.ts 的 migrations.seed 自动加载；
 * Prisma 8 的迁移体系不再内置 seed 钩子，需要手动执行（或在 CI 里调用）。
 *
 * 幂等设计：用 upsert 按 email 去重，
 * 多次执行不会因唯一约束冲突而失败。
 */
/* eslint-disable no-console -- CLI 脚本，console 是它的输出通道 */
import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import contractJson from './contract.json';
import * as bcrypt from 'bcryptjs';

/**
 * 种子用户列表。
 *
 * 添加新用户：在数组里多写一条对象即可。
 * 密码统一走 bcrypt hash 落库，源码里看到的明文不会被持久化。
 */
const SEED_USERS = [
  {
    email: '157884200@qq.com',
    password: '123456',
  },
] as const;

async function main() {
  // 与 PrismaService 同样的连接方式（Prisma 8 + @prisma/orm-postgres runtime）。
  // 这里不复用 PrismaService 是因为 seed 跑在 Nest 容器之外，
  // 没有 DI；自己建一个最直接。
  const db = postgres<Contract>({
    contractJson,
    url: process.env['DATABASE_URL']!,
  });
  await db.connect();

  try {
    for (const seedUser of SEED_USERS) {
      const password_hash = await bcrypt.hash(seedUser.password, 10);
      await db.orm.public.User.upsert({
        // VarChar(N) 在类型上是 branded string（防长度混用），写入处需断言
        create: {
          email: seedUser.email as Varchar<128>,
          password_hash: password_hash as Varchar<255>,
        },
        update: {}, // 已存在则不动，避免覆盖用户改过的密码
      });
      console.log(`已同步种子用户: ${seedUser.email}`);
    }
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
