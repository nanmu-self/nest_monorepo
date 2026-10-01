/**
 * 「跳到主内容」链接：键盘用户按 Tab 时第一个焦点。
 *
 * 默认藏在屏幕外（-translate-y），聚焦时才滑入。
 * 这是无障碍必需项：侧栏 + 顶栏加起来十几个导航链接，
 * 键盘用户每次都得 Tab 十几下才能到内容区。
 *
 * @param target 主内容容器的 id，默认 `#main`（需与布局里的 `<main id>` 对应）
 */
export function SkipToMain({ target = '#main' }: { target?: string }) {
  return (
    <a
      href={target}
      className="fixed inset-x-44 top-4 z-[999] -translate-y-52 rounded-lg bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground opacity-95 shadow-sm transition focus:translate-y-0 focus-visible:ring-1 focus-visible:ring-ring hover:bg-primary/90"
    >
      跳到主内容
    </a>
  );
}
