import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '@/prisma/prisma.module';
import { UsersModule } from '@/users/users.module';
import { TransformInterceptor } from '@/interceptors/transform.interceptor';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [],
  providers: [
    // 全局拦截器：统一成功响应封套 { code: 0, data: T, message: 'ok' }
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
