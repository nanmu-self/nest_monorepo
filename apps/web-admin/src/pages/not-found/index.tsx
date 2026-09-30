import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Home } from 'lucide-react';
import { Button } from '@app/ui';

export default function NotFoundPage() {
  // 返回上一页：与“回到首页”互补，覆盖用户“我刚才在哪”的诉求
  const navigate = useNavigate();

  return (
    <section className="center-block">
      {/* 装饰图标：浅灰圆盘 + 次级色图标，克制的视觉锚点 */}
      <div className="flex-center w-16 h-16 rounded-full bg-[var(--bg)] text-[var(--text-muted)] mb-2">
        <Compass size={28} />
      </div>

      {/* 主标题：超大字号 + 负字距，Apple 式排版主视觉 */}
      <h1 className="text-[96px] font-bold leading-none tracking-[-0.03em] text-[var(--text-h)]">
        404
      </h1>

      <p className="text-[17px] font-medium text-[var(--text-h)] mt-3">页面走丢了</p>
      <p className="text-[14px] text-[var(--text-muted)] max-w-sm text-center leading-relaxed">
        你访问的页面不存在或已被移动，请检查地址或返回继续操作。
      </p>

      {/* 双行动：主操作回到首页，次操作回退一步 */}
      <div className="flex items-center gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          返回上一页
        </Button>
        <Button asChild>
          <Link to="/">
            <Home size={16} />
            回到首页
          </Link>
        </Button>
      </div>
    </section>
  );
}
