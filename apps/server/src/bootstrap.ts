import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CORS_ORIGIN, SWAGGER_ENABLED } from './config/env';

/**
 * 挂载 Swagger 文档（/api/docs）。
 *
 * 无需配置 servers：@nestjs/swagger 能识别 URI 版本化，
 * 记录的 path 已自带 /api/v1、/api/v2 前缀，默认 server（当前 origin）即可。
 */
function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Short Link API')
    .setDescription('短链服务 API。统一响应封套：`{ code: 0, data, message }`。')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true }, // 刷新页面保留 Bearer token
  });
}

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

  if (SWAGGER_ENABLED) {
    setupSwagger(app);
  }
}
