import { redirect, type LoaderFunctionArgs } from 'react-router-dom';

/**
 * 简单的 token 存取。集中在一处，方便未来切换到 cookie / 双 token 等实现。
 */
export const auth = {
  getToken(): string | null {
    return localStorage.getItem('token');
  },
  setToken(token: string) {
    localStorage.setItem('token', token);
  },
  clear() {
    localStorage.removeItem('token');
  },
  isAuthenticated(): boolean {
    return !!auth.getToken();
  },
};

/**
 * 已登录用户才能进入的 loader；未登录跳转 /login 并保留原路径以便登录后回跳。
 * 用作数据路由的 `loader`，配合嵌套路由为一整棵 subtree 做守卫。
 */
export function requireAuth({ request }: LoaderFunctionArgs) {
  if (!auth.isAuthenticated()) {
    const from = new URL(request.url).pathname;
    const search = from === '/' ? '' : `?from=${encodeURIComponent(from)}`;
    throw redirect(`/login${search}`);
  }
  return null;
}

/**
 * 已登录用户不该再访问 /login；直接把他们送去后台首页。
 */
export function redirectIfAuthed() {
  if (auth.isAuthenticated()) {
    throw redirect('/');
  }
  return null;
}
