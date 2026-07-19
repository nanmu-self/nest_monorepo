import { createUnoConfig } from '@short-link/config-unocss';

/**
 * web-admin 专属 UnoCSS 配置
 *
 * 此处只写管理端专属样式，通用样式请去 packages/config-unocss
 */
export default createUnoConfig({
  shortcuts: {
    // 表格单元格：紧凑内边距 + 次级文本色
    'admin-table-cell': 'px-4 py-2 text-sm text-gray-700',
    // 页面标题：大字号 + 主文本色 + 底部留白
    'admin-page-header': 'text-xl font-semibold text-gray-900 mb-4',
  },
});
