// Prisma 8 配置。
//
// 与 Prisma 7 的差异：
//   - v7 用 defineConfig + datasource.url + migrations.seed；
//   - v8 改为 definePrismaConfig + @prisma/orm-postgres 的 ormConfig，
//     contract 指向 PSL 源文件，连接串走 orm 配置的 db.connection。
//
// dotenv 在本模块顶部手动加载：CLI（contract emit / db sign 等）
// 和 Nest 运行时都会评估此文件，确保 DATABASE_URL 在两种场景都可用。
import 'dotenv/config';
import { definePrismaConfig } from 'prisma/config';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: './prisma/contract.prisma',
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
});
