import { redirect, type LoaderFunctionArgs } from 'react-router-dom';
import { auth } from '@/lib/auth';

export { auth };

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
