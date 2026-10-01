import { useState, useEffect, useRef } from 'react';
import { type Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Badge, Button, Separator, Tooltip, TooltipContent, TooltipTrigger } from '@app/ui';

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>;
  entityName: string;
  children: React.ReactNode;
};

/**
 * 选中行时从底部浮起的批量操作条。
 *
 * 无选中行时返回 null，所以调用方可以直接把它写进页面，不用在外面套条件判断。
 *
 * 无障碍要点（这几部分手写很容易漏）：
 * - 方向键 / Home / End 在按钮之间移动焦点；
 * - Esc 清除选中——但要排除「焦点在 Radix 浮层里」的情况，
 *   否则用户想关下拉菜单却会先把选中清空；
 * - aria-live 区域播报选中数量，屏幕阅读器用户才知道刚才的操作生效了。
 */
export function DataTableBulkActions<TData>({
  table,
  entityName,
  children,
}: DataTableBulkActionsProps<TData>): React.ReactNode | null {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');

  // 向屏幕阅读器播报选中变化
  useEffect(() => {
    if (selectedCount === 0) return;

    // queueMicrotask：把状态更新推到当前任务之后，
    // 避免在 TanStack Table 的渲染过程中同步 setState 引发级联渲染
    queueMicrotask(() => {
      setAnnouncement(`已选中 ${selectedCount} 个${entityName}，批量操作栏已可用。`);
    });

    // 3 秒后清空，避免重复播报同一条消息
    const timer = setTimeout(() => setAnnouncement(''), 3000);
    return () => clearTimeout(timer);
  }, [selectedCount, entityName]);

  const handleClearSelection = () => {
    table.resetRowSelection();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const buttons = toolbarRef.current?.querySelectorAll('button');
    if (!buttons) return;

    const currentIndex = Array.from(buttons).findIndex(
      (button) => button === document.activeElement,
    );

    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % buttons.length;
        buttons[nextIndex]?.focus();
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1;
        buttons[prevIndex]?.focus();
        break;
      }
      case 'Home':
        event.preventDefault();
        buttons[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        buttons[buttons.length - 1]?.focus();
        break;
      case 'Escape': {
        // Radix UI 会在我们的事件处理之前先关掉浮层，所以拿不到 dropdown 的
        // open 状态，只能靠 DOM 位置判断事件是不是发生在浮层里
        const target = event.target as HTMLElement;
        const activeElement = document.activeElement as HTMLElement;

        // 事件源或当前焦点在 dropdown 触发器上
        const isFromDropdownTrigger =
          target?.getAttribute('data-slot') === 'dropdown-menu-trigger' ||
          activeElement?.getAttribute('data-slot') === 'dropdown-menu-trigger' ||
          target?.closest('[data-slot="dropdown-menu-trigger"]') ||
          activeElement?.closest('[data-slot="dropdown-menu-trigger"]');

        // 焦点在 dropdown 内容里（通过 portal 渲染，不在触发器的 DOM 子树内）
        const isFromDropdownContent =
          activeElement?.closest('[data-slot="dropdown-menu-content"]') ||
          target?.closest('[data-slot="dropdown-menu-content"]');

        // Esc 是想关下拉菜单 —— 不要动选中状态
        if (isFromDropdownTrigger || isFromDropdownContent) {
          return;
        }

        // Esc 确实是给批量操作栏的 —— 清除选中
        event.preventDefault();
        handleClearSelection();
        break;
      }
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {announcement}
      </div>

      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label={`已选中 ${selectedCount} 个${entityName}，批量操作栏已可用`}
        aria-describedby="bulk-actions-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl',
          'transition-all delay-100 duration-300 ease-out hover:scale-105',
          'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        )}
      >
        <div
          className={cn(
            'p-2 shadow-xl',
            'rounded-xl border',
            'bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/60',
            'flex items-center gap-x-2',
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleClearSelection}
                className="size-6 rounded-full"
                aria-label="清除选择"
                title="清除选择（Esc）"
              >
                <X />
                <span className="sr-only">清除选择</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear selection (Escape)</p>
            </TooltipContent>
          </Tooltip>

          <Separator className="h-5" orientation="vertical" aria-hidden="true" />

          <div className="flex items-center gap-x-1 text-sm" id="bulk-actions-description">
            <Badge
              variant="default"
              className="min-w-8 rounded-lg"
              aria-label={`已选中 ${selectedCount} 项`}
            >
              {selectedCount}
            </Badge>{' '}
            <span className="hidden sm:inline">已选中{entityName}</span>
          </div>

          <Separator className="h-5" orientation="vertical" aria-hidden="true" />

          {children}
        </div>
      </div>
    </>
  );
}
