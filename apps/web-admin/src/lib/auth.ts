/**
 * Token 存取单一真理源。
 *
 * 任何读写 localStorage 中 token 的代码都必须走这里，不允许直接调
 * `localStorage.getItem('token')` / `removeItem('token')`。
 * 后续若切换到 httpOnly cookie / 双 token 机制，只需改本文件一处。
 *
 * 401 等"会话失效"场景：`handleUnauthorized()` 会清 token 并通知监听器，
 * 监听器（注册在 main.tsx）负责 SPA 跳转并保留 `?from=` 回跳参数。
 * 主动登出场景：调 `clear()` 只清 token，跳转由调用方决定。
 */

const TOKEN_KEY = 'token';

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export const auth = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * 仅清 token，不通知、不跳转。
   * 用于主动登出——跳转由调用方（如 AppLayout）自行处理。
   */
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return localStorage.getItem(TOKEN_KEY) !== null;
  },

  /**
   * 会话失效：清 token + 通知所有监听器。
   * HTTP 401 场景由 `createHttp` 的 onUnauthorized 触发此方法。
   */
  handleUnauthorized(): void {
    localStorage.removeItem(TOKEN_KEY);
    unauthorizedListeners.forEach((listener) => listener());
  },

  /**
   * 订阅会话失效事件，返回取消订阅函数。
   */
  onUnauthorized(listener: UnauthorizedListener): () => void {
    unauthorizedListeners.add(listener);
    return () => {
      unauthorizedListeners.delete(listener);
    };
  },
};
