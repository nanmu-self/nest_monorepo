import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
  type UserConfig,
} from 'unocss';

import { shortcuts } from './shortcuts';
import { theme } from './theme';

// 方便消费方按需引用
export { shortcuts } from './shortcuts';
export { theme } from './theme';
export type { UnoTheme } from './theme';

/**
 * 默认主题（brand 色阶 + 功能色 + 字体 + 圆角）
 * 作为 createUnoConfig 内部 theme 的基础，消费方可通过 overrides.theme 追加
 */
const baseTheme = {
  colors: {
    brand: theme.colors.brand,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  },
  fontFamily: theme.fontFamily,
  borderRadius: theme.borderRadius,
} as const;

/**
 * 创建 UnoCSS 配置
 *
 * 默认应用：
 *   - 预设：presetUno（Tailwind 兼容原子类）+ presetAttributify（属性化写法）+ presetIcons（图标）
 *   - 变换器：transformerDirectives（@apply 等指令）+ transformerVariantGroup（分组写法 hover:focus:）
 *   - 主题：brand 色阶 + success/warning/danger + 字体 + 圆角
 *   - shortcuts：flex-center / btn-primary 等通用组合
 *
 * overrides 合并策略：
 *   - shortcuts：浅合并（消费方可覆盖同名 key、追加新 key）
 *   - theme：一级属性浅合并，colors 再深一层合并（允许追加新色板而不覆盖 brand）
 *   - 其他字段（rules / safelist / variants 等）：原样透传
 *
 * @param overrides 消费方覆盖项
 * @returns UserConfig，可直接作为 uno.config.ts 的默认导出
 */
export function createUnoConfig(overrides: UserConfig = {}): UserConfig {
  const overridesTheme = (overrides.theme ?? {}) as Record<string, unknown>;
  const overridesColors = (overridesTheme.colors ?? {}) as Record<string, unknown>;

  return defineConfig({
    presets: [
      presetUno(),
      presetAttributify(),
      presetIcons({
        scale: 1.2,
        warn: true,
        // 图标默认样式：inline-block + 垂直居中，避免在文本旁错位
        extraProperties: {
          display: 'inline-block',
          'vertical-align': 'middle',
        },
      }),
    ],
    transformers: [transformerDirectives(), transformerVariantGroup()],
    theme: {
      ...baseTheme,
      ...overridesTheme,
      colors: {
        ...baseTheme.colors,
        ...overridesColors,
      },
    },
    shortcuts: {
      ...shortcuts,
      ...((overrides.shortcuts as Record<string, string> | undefined) ?? {}),
    },
    rules: overrides.rules,
    safelist: overrides.safelist,
    variants: overrides.variants,
    envMode: overrides.envMode,
  });
}
