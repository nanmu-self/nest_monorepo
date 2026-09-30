import { createContext, use } from 'react';

export type Theme = 'light' | 'dark' | 'system';
/** 去掉 system 之后实际落到 `<html>` 上的那个值 */
export type ResolvedTheme = 'light' | 'dark';

export type ThemeState = {
  defaultTheme: Theme;
  resolvedTheme: ResolvedTheme;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resetTheme: () => void;
};

export const DEFAULT_THEME: Theme = 'system';

/**
 * 主题上下文。
 *
 * 单独成文件而不是和 Provider 放一起：React Fast Refresh 要求一个文件
 * 要么只导出组件、要么只导出非组件，混在一起会导致每次改动整页重挂载。
 */
export const ThemeContext = createContext<ThemeState>({
  defaultTheme: DEFAULT_THEME,
  resolvedTheme: 'light',
  theme: DEFAULT_THEME,
  setTheme: () => undefined,
  resetTheme: () => undefined,
});

export function useTheme(): ThemeState {
  return use(ThemeContext);
}
