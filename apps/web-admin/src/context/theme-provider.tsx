import { useCallback, useEffect, useMemo, useState } from 'react';

import { getCookie, removeCookie, setCookie } from '@/lib/cookies';
import { DEFAULT_THEME, ThemeContext, type ResolvedTheme, type Theme } from './theme-context';

const THEME_COOKIE_NAME = 'admin-theme';
/** 偏好存一年：主题属于长期偏好，不该每周重新问一次 */
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = THEME_COOKIE_NAME,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(
    () => (getCookie(storageKey) as Theme) || defaultTheme,
  );

  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (theme === 'system' ? systemTheme() : theme),
    [theme],
  );

  // 挂到 <html> 上的 class 是 dark 变体的开关（见 @app/ui styles.css 的
  // `@custom-variant dark (&:is(.dark *))`），所以必须改根元素而不是某层容器。
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    // 同步原生控件（滚动条、表单、日期选择器）的配色
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // 选了「跟随系统」时，系统切换深浅色要立刻跟随
  useEffect(() => {
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setThemeState('system'); // 触发 resolvedTheme 重算
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setCookie(storageKey, next, THEME_COOKIE_MAX_AGE);
      setThemeState(next);
    },
    [storageKey],
  );

  const resetTheme = useCallback(() => {
    removeCookie(storageKey);
    setThemeState(DEFAULT_THEME);
  }, [storageKey]);

  const value = useMemo(
    () => ({ defaultTheme, resolvedTheme, resetTheme, theme, setTheme }),
    [defaultTheme, resolvedTheme, resetTheme, theme, setTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
