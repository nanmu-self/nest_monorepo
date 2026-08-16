/**
 * 数据库种子脚本。
 *
 * 跑法：
 *   cd apps/server
 *   pnpm db:seed
 *
 * 由 prisma.config.ts 的 migrations.seed 配置自动加载，Prisma 7 在执行
 * `prisma migrate dev` / `prisma migrate reset` / `prisma db seed` 时
 * 会自动调用本脚本。直接 `pnpm db:seed` 也行（见 package.json）。
 *
 * 幂等设计：用 upsert 按 email 去重，
 * 多次执行不会因唯一约束冲突而失败。
 */
/* eslint-disable no-console -- CLI 脚本，console 是它的输出通道 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
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
  // 与 PrismaService 同样的连接方式（Prisma 7 + @prisma/adapter-pg）。
  // 这里不复用 PrismaService 是因为 seed 跑在 Nest 容器之外，
  // 没有 DI；自己 new 一个最直接。
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
  });

  try {
    for (const { email, password } of SEED_USERS) {
      const password_hash = await bcrypt.hash(password, 10);

      // upsert 按 email 去重：已存在则更新 password_hash 与 updated_at，
      // 缺失则插入。多次跑不会因 P2002 冲突失败。
      const user = await prisma.user.upsert({
        where: { email },
        update: { password_hash },
        create: { email, password_hash },
      });

      console.log(`  ✓ ${user.email} (id=${user.id})`);
    }

    console.log(`\nseed: inserted/updated ${SEED_USERS.length} user(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
