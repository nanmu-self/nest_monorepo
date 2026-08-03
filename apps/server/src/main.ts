import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './bootstrap';
// env 模块自身加载 dotenv，无需在此先 import 'dotenv/config'
import { PORT } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  await app.listen(PORT);
}
bootstrap();
