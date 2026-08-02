import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './bootstrap';
import { PORT } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  await app.listen(PORT);
}
bootstrap();