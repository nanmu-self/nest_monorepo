import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Ban, LockKeyhole, TriangleAlert, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@app/ui';

import { ErrorView } from '@/components/error-view';

/** 单一状态码对应的错误视图内容 */
type ErrorVariant = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** 自定义主操作，不传则用默认的「回到首页」 */
  action?: React.ReactNode;
  /** 传 null 隐藏「返回上一页」 */
  secondaryAction?: React.ReactNode;
};

/** 按 HTTP 状态码选择对应的错误视图。 */
const VARIANTS: Record<number, ErrorVariant> = {
  401: {
    icon: LockKeyhole,
    title: '登录状态已失效',
    description: '出于安全考虑，你的凭证已过期或无效。请重新登录后继续操作。',
    action: (
      <Button asChild>
        <Link to="/login">重新登录</Link>
      </Button>
    ),
  },
  403: {
    icon: Ban,
    title: '没有访问权限',
    description: '当前账号的角色不允许查看这个资源。如需权限，请联系管理员开通。',
  },
  503: {
    icon: Wrench,
    title: '服务维护中',
    description: '系统正在升级维护，稍后会自动恢复。请稍后再试。',
    action: null,
    secondaryAction: null,
  },
};

/**
 * 路由级错误边界。捕获：
 * - loader/action throw 的 Response（404 / 401 / 403 / 5xx 等 HTTP 语义错误）
 * - 组件渲染时抛出的普通 Error
 */
export default function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    const variant = VARIANTS[error.status];

    if (variant) {
      return (
        <ErrorView
          code={error.status}
          icon={variant.icon}
          title={variant.title}
          description={variant.description}
          action={variant.action}
          secondaryAction={variant.secondaryAction}
        />
      );
    }

    // 其余 4xx / 5xx 走兜底文案
    return (
      <ErrorView
        code={error.status}
        icon={TriangleAlert}
        title={error.status === 404 ? '页面走丢了' : '请求异常'}
        description={error.statusText || '服务返回了一个非预期的状态码，请稍后重试。'}
      />
    );
  }

  const message = error instanceof Error ? error.message : '未知错误';

  return (
    <section className="center-block">
      <div className="mb-2 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] text-[var(--danger)]">
        <TriangleAlert size={28} />
      </div>
      <h1>出错了</h1>
      <p className="mt-1 max-w-md text-center text-[15px] text-[var(--text-muted)]">{message}</p>
      <Button asChild className="mt-4">
        <Link to="/">回到首页</Link>
      </Button>
    </section>
  );
}
