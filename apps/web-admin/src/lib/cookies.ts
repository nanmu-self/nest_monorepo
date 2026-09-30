/**
 * cookie 读写工具（不引第三方库）。
 *
 * 用 cookie 而非 localStorage 存主题偏好：cookie 会被服务端读到，
 * SSR / 边缘渲染时可以在首屏 HTML 里就带上正确的 class，避免主题闪烁。
 */

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

/** 读取 cookie 值，不存在返回 undefined */
export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return undefined;
}

/** 写 cookie，`maxAge` 单位秒 */
export function setCookie(name: string, value: string, maxAge: number = DEFAULT_MAX_AGE): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${maxAge}; samesite=lax`;
}

/** 删除 cookie（把 max-age 设为 0） */
export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; samesite=lax`;
}
