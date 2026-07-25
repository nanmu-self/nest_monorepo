import { Global, Module } from '@nestjs/common';
import { PrismaService, DATABASE_URL } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_URL,
      useFactory: () => {
        const url = process.env.DATABASE_URL;
        if (!url) {
          throw new Error('DATABASE_URL is not set; check apps/server/.env');
        }
        return url;
      },
    },
    PrismaService,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
