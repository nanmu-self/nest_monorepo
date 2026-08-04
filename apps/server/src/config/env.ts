/**
 * 集中式环境变量校验。
 *
 * 启动时一次性读取并校验所有必需配置，缺失或不合法直接 throw，
 * 让进程在启动阶段崩溃，而不是带着不安全默认值静默运行、
 * 等到第一个请求才 500。
 *
 * dotenv 在本模块顶部自行加载，因此无论谁先 import 本模块
 * （main.ts、Nest 模块、脚本、测试）都能读到 .env。
 * 不要把它挪回调用方，那会形成"必须第一行 import"的隐性顺序契约，
 * 一旦有人调整 import 顺序就会读到 undefined 而静默降级。
 */
import 'dotenv/config';

// ---------- NODE_ENV ----------

const VALID_NODE_ENVS = ['development', 'production', 'test'] as const;
type NodeEnv = (typeof VALID_NODE_ENVS)[number];

function parseNodeEnv(): NodeEnv {
  const raw = process.env.NODE_ENV ?? 'development';
  if (!VALID_NODE_ENVS.includes(raw as NodeEnv)) {
    throw new Error(
      `NODE_ENV="${raw}" 不合法，必须是 ${VALID_NODE_ENVS.join(' / ')} 之一（拼错会导致生产守卫静默失效）`,
    );
  }
  return raw as NodeEnv;
}

export const NODE_ENV = parseNodeEnv();
export const IS_PRODUCTION = NODE_ENV === 'production';

// ---------- PORT ----------

/** 未显式配置时的监听端口 */
const DEFAULT_PORT = 3000;

/**
 * 解析监听端口。
 *
 * 允许 0：TCP 语义上 0 表示“由内核分配空闲端口”，
 * 集成测试并行启动多个实例时靠它避免端口冲突。
 * 空字符串会被单独拦掉——Number('') === 0，
 * 否则 `PORT=` 这种写错的配置会静默变成随机端口。
 */
function parsePort(): number {
  const raw = process.env.PORT?.trim();
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT="${raw}" 不合法，必须是 0–65535 的整数（0 表示由内核分配）`);
  }
  return port;
}

export const PORT = parsePort();

// ---------- DATABASE_URL ----------

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL 未配置：请在 apps/server/.env 中设置 PostgreSQL 连接字符串');
  }
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    throw new Error('DATABASE_URL 必须以 postgresql:// 或 postgres:// 开头');
  }
  return url;
}

export const DATABASE_URL = requireDatabaseUrl();

// ---------- CORS_ORIGIN ----------

/**
 * 解析 CORS 允许来源。
 * - production 必须显式配置，禁止"允许所有 + 带凭证"
 * - 非 production 未配置时返回 true（反射请求 Origin，仅限本地开发）
 */
function parseCorsOrigin(): string[] | true {
  const raw = process.env.CORS_ORIGIN?.trim();

  if (!raw) {
    if (IS_PRODUCTION) {
      throw new Error(
        'CORS_ORIGIN 未配置：生产环境必须显式设置允许的来源（逗号分隔），禁止使用"允许所有"',
      );
    }
    return true;
  }

  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN 解析后为空，请检查格式（逗号分隔的来源列表）');
  }

  return origins;
}

export const CORS_ORIGIN = parseCorsOrigin();

// ---------- JWT_SECRET ----------

/** HS256 对称密钥建议 >= 256 bit，即 >= 32 字节 */
const JWT_SECRET_MIN_LENGTH = 32;

/**
 * 已知不安全的占位/默认值，拒绝启动。
 *
 * 长度校验只能拦住"太短"，拦不住 cp .env.example .env 后原样使用的
 * 公开占位符——这些字符串写在仓库里，任何人都能看到，用它们签名
 * 等同于无密钥。
 */
const INSECURE_JWT_SECRETS = new Set([
  'replace-with-a-long-random-string-at-least-32-chars',
  'default-secret-change-in-production',
  'your-secret-key-change-in-production',
  'change-me',
  'secret',
]);

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      `JWT_SECRET 未配置：请在 apps/server/.env 中设置一个长度 >= ${JWT_SECRET_MIN_LENGTH} 的随机字符串（openssl rand -base64 48）`,
    );
  }
  if (INSECURE_JWT_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET 使用了公开的占位值，请用 openssl rand -base64 48 生成一个真实随机密钥',
    );
  }
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET 长度不足（当前 ${secret.length}，要求 >= ${JWT_SECRET_MIN_LENGTH}），请使用更强的随机密钥`,
    );
  }
  return secret;
}

export const JWT_SECRET = requireJwtSecret();

// ---------- 业务常量 ----------

/** Token 有效期（秒），JwtModule 与登录响应共用此值，避免漂移 */
export const JWT_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 天
