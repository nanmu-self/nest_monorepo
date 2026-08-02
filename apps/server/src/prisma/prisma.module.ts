import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma 全局模块。
 *
 * DATABASE_URL 由 @/config/env 在启动时校验，无需再用工厂提供。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}