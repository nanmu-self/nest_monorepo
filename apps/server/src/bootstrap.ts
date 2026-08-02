import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';

/**
 * 解析 CORS 允许来源。
 *
 * - production 必须显式配置 CORS_ORIGIN，缺失或为空直接抛错，避免静默退化成"任意来源 + 带凭证"。
 * - 非 production 未配置时默认反射请求 Origin（仅限本地开发）。
 */
function resolveCorsOrigin(): string[] | true {
  const isProduction = process.env.NODE_ENV === 'production';
  const raw = process.env.CORS_ORIGIN?.trim();

  if (!raw) {
    if (isProduction) {
      throw new Error(
        'CORS_ORIGIN 未配置：生产环境必须显式设置允许的来源（逗号分隔），禁止使用"允许所有"。',
      );
    }
    return true;
  }

  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
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
    origin: resolveCorsOrigin(),
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
