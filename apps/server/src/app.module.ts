import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from '@/prisma/prisma.module';
import { UsersModule } from '@/users/users.module';
import { AuthModule } from '@/auth/auth.module';
import { TransformInterceptor } from '@/interceptors/transform.interceptor';
import { AllExceptionFilter } from '@/filters/all-exception.filter';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [],
  providers: [
    // 全局拦截器：统一成功响应封套 { code: 0, data: T, message: 'ok' }
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // 全局过滤器：统一错误响应封套 { code: number, message: string, data?: any }
    { provide: APP_FILTER, useClass: AllExceptionFilter },
  ],
})
export class AppModule {}
