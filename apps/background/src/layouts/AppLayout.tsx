import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { auth } from '@/router/guards';

/**
 * 后台外壳布局：左侧导航 + 顶部栏 + 主内容区。
 * 通过 <Outlet /> 渲染子路由。
 */
export default function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">短链管理</div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            仪表盘
          </NavLink>
          <NavLink to="/short-links" className={({ isActive }) => (isActive ? 'active' : '')}>
            短链
          </NavLink>
          <NavLink to="/admins" className={({ isActive }) => (isActive ? 'active' : '')}>
            管理员
          </NavLink>
        </nav>
      </aside>

      <div className="app-body">
        <header className="app-header">
          <div className="app-header-title" />
          <button type="button" className="btn-logout" onClick={handleLogout}>
            退出登录
          </button>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
