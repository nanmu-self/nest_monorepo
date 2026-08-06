import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from '@/router';
import { auth } from '@/lib/auth';
import './index.css';

// 会话失效（401 等）统一跳登录页：保留当前路径作为 from，登录后可回跳。
// 走 router.navigate 而非 window.location.href，避免整页刷新。
auth.onUnauthorized(() => {
  const from = window.location.pathname + window.location.search;
  const search = from === '/' ? '' : `?from=${encodeURIComponent(from)}`;
  router.navigate(`/login${search}`, { replace: true });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
