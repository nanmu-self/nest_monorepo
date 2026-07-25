import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';

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
        <div className="flex-center w-16 h-16 rounded-full bg-[#f5f5f7] text-[#86868b] mb-2">
          <TriangleAlert size={28} />
        </div>
        <h1>{error.status}</h1>
        <p className="text-[15px] text-[#86868b]">{error.statusText || '请求异常'}</p>
        <Link to="/" className="btn-primary mt-4">
          回到首页
        </Link>
      </section>
    );
  }

  const message = error instanceof Error ? error.message : '未知错误';
  return (
    <section className="center-block">
      <div className="flex-center w-16 h-16 rounded-full bg-[#fff2f1] text-[#ff3b30] mb-2">
        <TriangleAlert size={28} />
      </div>
      <h1>出错了</h1>
      <p className="text-[15px] text-[#86868b] max-w-md text-center">{message}</p>
      <Link to="/" className="btn-primary mt-4">
        回到首页
      </Link>
    </section>
  );
}
