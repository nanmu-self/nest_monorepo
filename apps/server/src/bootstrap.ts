import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { CORS_ORIGIN } from './config/env';

/**
 * 统一应用配置，供 main.ts 复用。
 */
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1', '2'],
  });

  app.enableCors({
    origin: CORS_ORIGIN,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}