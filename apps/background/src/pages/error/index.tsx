import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

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
        <h1>{error.status}</h1>
        <p>{error.statusText || '请求异常'}</p>
        <Link to="/">回到首页</Link>
      </section>
    );
  }

  const message = error instanceof Error ? error.message : '未知错误';
  return (
    <section className="center-block">
      <h1>出错了</h1>
      <p>{message}</p>
      <Link to="/">回到首页</Link>
    </section>
  );
}
