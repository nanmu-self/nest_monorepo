import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './bootstrap';
// env 模块自身加载 dotenv，无需在此先 import 'dotenv/config'
import { PORT } from './config/env';

async function bootstrap() {
  // bufferLogs：把 useLogger(pino) 之前的启动期日志先缓存，
  // 待 setupApp 接管 logger 后统一回放，避免 Nest 模块加载日志
  // 一半走默认 console、一半走 pino 的割裂输出。
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  setupApp(app);
  await app.listen(PORT);
}
bootstrap();
