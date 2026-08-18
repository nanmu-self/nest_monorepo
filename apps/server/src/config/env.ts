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

// ---------- SWAGGER_ENABLED ----------

/**
 * 解析 Swagger 开关（文档挂载在 /api/docs）。
 * - 未配置：非生产默认开启（开发自用），生产默认关闭（不向外部暴露接口面）
 * - 显式配置：只接受 true / false，拼错直接崩溃而不是静默落到默认值
 */
function parseSwaggerEnabled(): boolean {
  const raw = process.env.SWAGGER_ENABLED?.trim().toLowerCase();
  if (raw === undefined || raw === '') {
    return !IS_PRODUCTION;
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error('SWAGGER_ENABLED 只接受 true / false（未配置时：非生产默认开启、生产默认关闭）');
}

export const SWAGGER_ENABLED = parseSwaggerEnabled();

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

// ---------- 七牛云对象存储（可选功能） ----------

/** 七牛存储区域标识（与 qiniu SDK 的 zone 常量一一对应） */
export const VALID_QINIU_REGIONS = ['z0', 'z1', 'z2', 'na0', 'as0', 'cn-east-2'] as const;
export type QiniuRegion = (typeof VALID_QINIU_REGIONS)[number];

/** 七牛完整配置；未启用时为 null */
export interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: QiniuRegion;
  domain: string;
}

/** 七牛全部配置项 */
const QINIU_ENV_KEYS = [
  'QINIU_ACCESS_KEY',
  'QINIU_SECRET_KEY',
  'QINIU_BUCKET',
  'QINIU_REGION',
  'QINIU_DOMAIN',
] as const;

/**
 * 解析七牛存储区域。
 *
 * 区域标识与七牛 SDK zone 常量的对应：
 *   z0       华东-浙江
 *   z1       华北
 *   z2       华南
 *   na0      北美
 *   as0      东南亚
 *   cn-east-2 华东-浙江2
 */
function parseQiniuRegion(raw: string): QiniuRegion {
  if (!VALID_QINIU_REGIONS.includes(raw as QiniuRegion)) {
    throw new Error(`QINIU_REGION="${raw}" 不合法，必须是 ${VALID_QINIU_REGIONS.join(' / ')} 之一`);
  }
  return raw as QiniuRegion;
}

/**
 * 解析七牛配置（可选功能）。
 *
 * - 五个变量全部未配置 -> 返回 null，对象存储功能整体禁用，
 *   服务正常启动，相关接口返回 STORAGE_NOT_CONFIGURED。
 *   模板使用者不需要对象存储时无需伪造任何凭证。
 * - 部分配置 -> 启动崩溃。宁可拒绝启动也不带着半份配置静默降级，
 *   否则漏填的那一项要等到第一次调用才以 500 暴露。
 */
function parseQiniuConfig(): QiniuConfig | null {
  const configured = QINIU_ENV_KEYS.filter((k) => process.env[k]?.trim());
  if (configured.length === 0) {
    return null;
  }
  if (configured.length !== QINIU_ENV_KEYS.length) {
    const missing = QINIU_ENV_KEYS.filter((k) => !configured.includes(k));
    throw new Error(
      `七牛配置不完整：已配置 ${configured.join(' / ')}，还缺 ${missing.join(' / ')}。` +
        '如不需要对象存储，请把这五个 QINIU_* 变量全部删除或注释掉',
    );
  }

  return {
    accessKey: process.env.QINIU_ACCESS_KEY!.trim(),
    secretKey: process.env.QINIU_SECRET_KEY!.trim(),
    bucket: process.env.QINIU_BUCKET!.trim(),
    region: parseQiniuRegion(process.env.QINIU_REGION!.trim()),
    // 去掉末尾斜杠，避免拼接出双斜杠
    domain: process.env.QINIU_DOMAIN!.trim().replace(/\/+$/, ''),
  };
}

export const QINIU_CONFIG = parseQiniuConfig();

// ---------- 业务常量 ----------

/** Token 有效期（秒），JwtModule 与登录响应共用此值，避免漂移 */
export const JWT_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 天
