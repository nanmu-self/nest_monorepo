import { Outlet } from 'react-router-dom';

/**
 * 未登录页面外壳（登录 / 注册 / 忘记密码 等）。
 *
 * 仅负责居中，具体卡片由各页面用 shadcn Card 自行渲染。
 */
export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <Outlet />
    </div>
  );
}
