import { createBrowserRouter, Navigate } from 'react-router-dom';

import ErrorPage from '@/pages/error';
import { redirectIfAuthed, requireAuth } from './guards';

/**
 * 路由约定：
 * - 未登录只可访问 `/login`（AuthLayout 下）。
 * - 已登录部分统一挂在 AppLayout 下，`requireAuth` 作为父级 loader 守卫整棵子树。
 * - 页面级组件 lazy 加载，产出各自 chunk；ErrorPage 保持同步引入，
 *   这样 lazy chunk 拉取失败时错误边界立刻可用。
 * - errorElement 挂在 AppLayout 上，任意子路由 throw 都会命中同一个错误页。
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    loader: redirectIfAuthed,
    ErrorBoundary: ErrorPage,
    lazy: async () => {
      const mod = await import('@/layouts/AuthLayout');
      return { Component: mod.default };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const mod = await import('@/pages/login');
          return { Component: mod.default };
        },
      },
    ],
  },
  {
    path: '/',
    loader: requireAuth,
    ErrorBoundary: ErrorPage,
    lazy: async () => {
      const mod = await import('@/layouts/AppLayout');
      return { Component: mod.default };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const mod = await import('@/pages/dashboard');
          return { Component: mod.default };
        },
      },
      {
        path: 'users',
        lazy: async () => {
          const mod = await import('@/pages/users');
          return { Component: mod.default };
        },
      },
      {
        path: 'storage',
        lazy: async () => {
          const mod = await import('@/pages/storage');
          return { Component: mod.default };
        },
      },
      // 404 兜底
      {
        path: '*',
        lazy: async () => {
          const mod = await import('@/pages/not-found');
          return { Component: mod.default };
        },
      },
    ],
  },
  // 未匹配到 /login 或 / 前缀时的兜底
  { path: '*', element: <Navigate to="/" replace /> },
]);
