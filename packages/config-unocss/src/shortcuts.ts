/**
 * 通用 shortcut：跨业务复用的原子化样式组合
 * 仅放与具体业务无关的工具类组合；业务专属样式请在消费方的 uno.config.ts 中追加
 */

export const shortcuts = {
  // 布局类：水平居中 / 两端对齐 / 垂直居中
  'flex-center': 'flex items-center justify-center',
  'flex-between': 'flex items-center justify-between',
  'flex-col-center': 'flex flex-col items-center justify-center',

  // 按钮类：主按钮 / 幽灵按钮
  'btn-primary':
    'inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-md bg-brand-500 text-white hover:bg-brand-600 transition-colors',
  'btn-ghost':
    'inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-md bg-transparent text-gray-700 hover:bg-gray-100 transition-colors',

  // 卡片
  card: 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm',
} as const;
