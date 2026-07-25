import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Home } from 'lucide-react';

export default function NotFoundPage() {
  // 返回上一页：与“回到首页”互补，覆盖用户“我刚才在哪”的诉求
  const navigate = useNavigate();

  return (
    <section className="center-block">
      {/* 装饰图标：浅灰圆盘 + 次级色图标，克制的视觉锚点 */}
      <div className="flex-center w-16 h-16 rounded-full bg-[#f5f5f7] text-[#86868b] mb-2">
        <Compass size={28} />
      </div>

      {/* 主标题：超大字号 + 负字距，Apple 式排版主视觉 */}
      <h1 className="text-[96px] font-bold leading-none tracking-[-0.03em] text-[#1d1d1f]">404</h1>

      <p className="text-[17px] font-medium text-[#1d1d1f] mt-3">页面走丢了</p>
      <p className="text-[14px] text-[#86868b] max-w-sm text-center leading-relaxed">
        你访问的页面不存在或已被移动，请检查地址或返回继续操作。
      </p>

      {/* 双行动：主操作回到首页，次操作回退一步 */}
      <div className="flex items-center gap-3 mt-6">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft size={16} />
          返回上一页
        </button>
        <Link to="/" className="btn-primary">
          <Home size={16} />
          回到首页
        </Link>
      </div>
    </section>
  );
}
