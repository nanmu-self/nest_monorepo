import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Link2, LogOut, PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react';

import { auth } from '@/lib/auth';

/** 导航项集中声明：侧栏渲染与顶栏标题共用同一份数据源 */
const NAV_ITEMS = [
  { to: '/', label: '仪表盘', icon: LayoutGrid, end: true },
  { to: '/short-links', label: '短链', icon: Link2, end: false },
  { to: '/admins', label: '管理员', icon: Users, end: false },
] as const;

/** 折叠状态持久化 key：用户偏好跨会话保留 */
const SIDEBAR_KEY = 'sidebar-collapsed';

/**
 * 后台外壳布局：左侧导航 + 顶部栏 + 主内容区。
 * 通过 <Outlet /> 渲染子路由。侧边栏可折叠为纯图标栏。
 */
export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
  };

  const handleLogout = () => {
    auth.clear();
    navigate('/login', { replace: true });
  };

  // 顶栏标题跟随当前路由，让用户始终知道“我在哪”
  const currentNav = NAV_ITEMS.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );

  return (
    <div className="app-shell" data-collapsed={collapsed}>
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="app-brand-mark">S</span>
          <span className="app-brand-text">短链管理</span>
        </div>
        <nav>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              // 折叠为纯图标栏时，用原生 tooltip 兜底可读性
              title={collapsed ? label : undefined}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-footer">Short Link Admin</div>
      </aside>

      <div className="app-body">
        <header className="app-header">
          <div className="app-header-left">
            <button
              type="button"
              className="btn-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <div className="app-header-title">{currentNav?.label ?? ''}</div>
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            <LogOut size={15} />
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
