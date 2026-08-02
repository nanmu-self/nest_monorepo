/**
 * 集中式环境变量校验。
 *
 * 启动时强制存在的配置在此处读取并校验，缺失或不合法直接 throw，
 * 让进程崩溃，而不是用硬编码的不安全默认值静默启动。
 *
 * 注意：本模块依赖 main.ts 首行 `import 'dotenv/config'` 已执行，
 * 不要在 dotenv 加载前被其他模块间接引入。
 */

/** HS256 对称密钥建议 >= 256 bit，即 >= 32 字节 */
const JWT_SECRET_MIN_LENGTH = 32;

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      `JWT_SECRET 未配置：请在 apps/server/.env 中设置一个长度 >= ${JWT_SECRET_MIN_LENGTH} 的随机字符串`,
    );
  }
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET 长度不足（当前 ${secret.length}，要求 >= ${JWT_SECRET_MIN_LENGTH}），请使用更强的随机密钥`,
    );
  }
  return secret;
}

/** 校验通过的 JWT 签名密钥，启动时一次性求值 */
export const JWT_SECRET = requireJwtSecret();

/** Token 有效期（秒），JwtModule 与登录响应共用此值，避免漂移 */
export const JWT_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 天