/**
 * 设计 token：定义品牌色阶、功能色、字体、圆角等基础视觉变量
 * 消费方通过 createUnoConfig() 自动应用，也可单独 import 引用
 */

export interface UnoTheme {
  /** 品牌色阶，50~900，主色为 brand-500 */
  colors: {
    brand: Record<
      '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
      string
    >;
    /** 成功色 */
    success: string;
    /** 警告色 */
    warning: string;
    /** 危险色 */
    danger: string;
  };
  /** 字体族 */
  fontFamily: {
    sans: string;
    mono: string;
  };
  /** 圆角 */
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

export const theme: UnoTheme = {
  colors: {
    // 品牌主色：蓝色族，brand-500 = #3b82f6（与 Tailwind blue 一致，方便记忆）
    brand: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  fontFamily: {
    sans: "system-ui, 'Segoe UI', Roboto, sans-serif",
    mono: 'ui-monospace, Consolas, monospace',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '12px',
  },
};
