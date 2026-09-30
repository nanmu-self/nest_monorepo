import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@app/ui';

/**
 * 路由级错误边界。捕获：
 * - loader/action throw 的 Response（404 / 401 等 HTTP 语义错误）
 * - 组件渲染时抛出的普通 Error
 */
export default function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <section className="center-block">
        <div className="flex-center w-16 h-16 rounded-full bg-[var(--bg)] text-[var(--text-muted)] mb-2">
          <TriangleAlert size={28} />
        </div>
        <h1>{error.status}</h1>
        <p className="text-[15px] text-[var(--text-muted)]">{error.statusText || '请求异常'}</p>
        <Button asChild className="mt-4">
          <Link to="/">回到首页</Link>
        </Button>
      </section>
    );
  }

  const message = error instanceof Error ? error.message : '未知错误';
  return (
    <section className="center-block">
      <div className="flex-center w-16 h-16 rounded-full bg-[rgba(239,68,68,0.08)] text-[var(--danger)] mb-2">
        <TriangleAlert size={28} />
      </div>
      <h1>出错了</h1>
      <p className="text-[15px] text-[var(--text-muted)] max-w-md text-center">{message}</p>
      <Button asChild className="mt-4">
        <Link to="/">回到首页</Link>
      </Button>
    </section>
  );
}
