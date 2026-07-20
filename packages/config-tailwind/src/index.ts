/**
 * 共享 Tailwind 配置包
 *
 * 使用方式（消费方 CSS 文件）：
 *   @import 'tailwindcss';
 *   @import '@short-link/config-tailwind/styles.css';
 *
 * styles.css 内含 @theme（设计 token）与 @layer components（通用工具类组合），
 * 消费方可在自己的 CSS 中追加 @theme / @layer components 进行覆盖。
 */

export { theme } from './theme';
export type { TailwindTheme } from './theme';
