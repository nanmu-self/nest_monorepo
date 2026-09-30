import { useEffect } from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/ui';
import { cn } from '@/lib/utils';

import { useTheme, type Theme } from '@/context/theme-context';

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
];

/**
 * 主题切换：太阳/月亮交叉淡入 + 旋转，勾选项表示当前选择。
 * 放在 header 右侧，图标按钮走 ghost 变体，不占主视觉层级。
 */
export function ThemeSwitch() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // 同步浏览器 UI（地址栏等）的配色
  useEffect(() => {
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) meta.setAttribute('content', resolvedTheme === 'dark' ? '#0f172a' : '#ffffff');
  }, [resolvedTheme]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="切换主题"
          className="relative scale-95 rounded-full transition-transform hover:scale-100"
        >
          <Sun
            className={cn(
              'absolute size-[1.2rem] transition-all duration-300',
              resolvedTheme === 'dark' ? 'scale-0 -rotate-90' : 'scale-100 rotate-0',
            )}
          />
          <Moon
            className={cn(
              'absolute size-[1.2rem] transition-all duration-300',
              resolvedTheme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 rotate-90',
            )}
          />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            className={cn(theme !== option.value && 'text-muted-foreground')}
          >
            {option.label}
            <Check className={cn('ms-auto', theme !== option.value && 'hidden')} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
