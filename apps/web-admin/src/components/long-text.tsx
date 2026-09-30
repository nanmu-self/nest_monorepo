import { useLayoutEffect, useRef, useState } from 'react';
import {
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@app/ui';

type LongTextProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

/** 元素内容是否超出可视区域（被 truncate 截断） */
function checkOverflow(node: HTMLElement | null) {
  if (!node) return false;
  return node.offsetHeight < node.scrollHeight || node.offsetWidth < node.scrollWidth;
}

/**
 * 过长文本的单行截断 + 悬浮查看全文。
 *
 * 只有真的溢出时才挂 Tooltip/Popover —— 不溢出的列不需要多余的浮层，
 * 鼠标划过多个单元格时也不会弹出一堆空提示。
 *
 * 桌面端用 Tooltip（轻量、不抢焦点），移动端用 Popover（手指点按更可靠，
 * Tooltip 的 hover 语义在触屏上基本不触发）。
 *
 * 溢出检测用 ResizeObserver：容器宽度变化（窗口缩放、侧栏折叠、
 * 表格列宽重算）都会重新判定，比只在挂载时量一次可靠。
 * 状态更新放在 layout effect 里，避免闪烁。
 */
export function LongText({ children, className = '', contentClassName = '' }: LongTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const sync = () => setIsOverflowing(checkOverflow(node));
    sync();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', sync);
      return () => window.removeEventListener('resize', sync);
    }
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  // 隐藏时也要保留一个可测量的节点，否则重新显示时判定依据丢失
  if (!isOverflowing) {
    return (
      <div ref={ref} className={cn('truncate', className)}>
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Tooltip>
          <TooltipTrigger asChild>
            <div ref={ref} className={cn('truncate', className)}>
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className={contentClassName}>{children}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="sm:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <div ref={ref} className={cn('truncate', className)}>
              {children}
            </div>
          </PopoverTrigger>
          <PopoverContent className={cn('w-fit', contentClassName)}>
            <p>{children}</p>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
