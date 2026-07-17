import { Outlet } from 'react-router-dom';

/**
 * 未登录页面外壳（登录 / 注册 / 忘记密码 等）。
 */
export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Outlet />
      </div>
    </div>
  );
}
