import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AdminsModule } from '@/admins/admins.module';
@Module({
  imports: [PrismaModule, AdminsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
