import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Home } from 'lucide-react';

export default function NotFoundPage() {
  // 返回上一页：与“回到首页”互补，覆盖用户“我刚才在哪”的诉求
  const navigate = useNavigate();

  return (
    <section className="center-block">
      {/* 装饰图标：brand 淡色背板 + 主色图标，给 404 一个视觉锚点 */}
      <div className="flex-center w-16 h-16 rounded-2xl bg-brand-50 text-brand-500 mb-2">
        <Compass className="w-8 h-8" />
      </div>

      {/* 主标题：超大字号 + brand 渐变，让 404 本身成为主视觉 */}
      <h1 className="text-8xl font-bold leading-none bg-gradient-to-br from-brand-400 to-brand-700 bg-clip-text text-transparent">
        404
      </h1>

      <p className="text-lg font-medium text-gray-900 mt-3">页面走丢了</p>
      <p className="text-sm text-gray-500 max-w-sm text-center">
        你访问的页面不存在或已被移动，请检查地址或返回继续操作。
      </p>

      {/* 双行动：主操作回到首页，次操作回退一步 */}
      <div className="flex items-center gap-3 mt-6">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft />
          返回上一页
        </button>
        <Link to="/" className="btn-primary">
          <Home />
          回到首页
        </Link>
      </div>
    </section>
  );
}
