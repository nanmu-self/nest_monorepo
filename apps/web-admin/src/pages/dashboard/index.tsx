import { ArrowUpRight, Link2, MousePointerClick, Users } from 'lucide-react';

/**
 * 仪表盘：核心指标卡片 + 快速入口。
 * 指标数据后续接入后端统计接口，当前为占位。
 */
const STATS = [
  { label: '短链总数', value: '—', icon: Link2 },
  { label: '总访问量', value: '—', icon: MousePointerClick },
  { label: '用户数', value: '—', icon: Users },
] as const;

const QUICK_ACTIONS = [
  {
    title: '创建短链',
    description: '生成一个新的短链接，支持自定义后缀与过期时间。',
    to: '/short-links',
  },
  {
    title: '管理用户',
    description: '查看和管理后台注册的用户账号。',
    to: '/users',
  },
] as const;

export default function DashboardPage() {
  return (
    <section>
      <h1 className="admin-page-header">仪表盘</h1>

      {/* 指标卡片：数字是主角，用 Apple 式大字号 + 负字距 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="apple-card">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#86868b]">{label}</span>
              <Icon size={16} className="text-[#86868b]" />
            </div>
            <div className="stat-value mt-3">{value}</div>
            <div className="stat-label">统计接口接入后展示</div>
          </div>
        ))}
      </div>

      {/* 快速入口：卡片式导航，hover 轻微上浮 */}
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f] mt-10 mb-4">
        快速开始
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUICK_ACTIONS.map(({ title, description, to }) => (
          <a
            key={to}
            href={to}
            className="apple-card group flex items-start justify-between gap-4 transition-[transform,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.08)]"
          >
            <div>
              <div className="text-[15px] font-medium text-[#1d1d1f]">{title}</div>
              <p className="text-[13px] text-[#86868b] mt-1 leading-relaxed">{description}</p>
            </div>
            <ArrowUpRight
              size={16}
              className="shrink-0 text-[#86868b] transition-[color,transform] duration-200 ease-out-strong group-hover:text-[#1d1d1f] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
