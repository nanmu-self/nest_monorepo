import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@app/ui';

export type ErrorViewProps = {
  /** 超大字号状态码；传 null 则不渲染数字（如 500 且不暴露具体原因时） */
  code?: number | string | null;
  /** 主标题，一句话说清发生了什么 */
  title: string;
  /** 补充说明，告诉用户能做什么 */
  description?: React.ReactNode;
  /** 装饰图标，不传则不显示图标圆盘 */
  icon?: LucideIcon;
  /** 主操作，默认「回到首页」 */
  action?: React.ReactNode;
  /** 次操作，默认「返回上一页」；传 null 隐藏 */
  secondaryAction?: React.ReactNode;
  className?: string;
};

/**
 * 错误/异常状态的统一视图：状态码 + 图标 + 标题 + 说明 + 双行动。
 *
 * 抽出来是为了让 401 / 403 / 404 / 500 / 503 共用同一套排版与措辞结构——
 * 各自只填内容，不各自发明布局。配色一律走 var() token，暗色模式自动跟随。
 */
export function ErrorView({
  code,
  title,
  description,
  icon: Icon,
  action,
  secondaryAction,
  className,
}: ErrorViewProps) {
  const navigate = useNavigate();

  return (
    <section className={`center-block ${className ?? ''}`}>
      {Icon && (
        <div className="flex-center mb-2 h-16 w-16 rounded-full bg-[var(--bg)] text-[var(--text-muted)]">
          <Icon size={28} />
        </div>
      )}

      {code !== null && code !== undefined && (
        <h1 className="text-[96px] leading-none font-bold tracking-[-0.03em] text-[var(--text-h)]">
          {code}
        </h1>
      )}

      <p className="mt-3 text-[17px] font-medium text-[var(--text-h)]">{title}</p>

      {description && (
        <p className="mt-2 max-w-sm text-center text-[14px] leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        {secondaryAction !== null && (
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            返回上一页
          </Button>
        )}
        {action ?? (
          <Button asChild>
            <Link to="/">
              <Home size={16} />
              回到首页
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
