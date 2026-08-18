import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

/**
 * UI 组件包构建配置。
 *
 * 声明文件由 `tsc -p tsconfig.build.json` 生成。
 * styles.css 由 onSuccess 复制到 dist/。
 * watch 模式监听整个 src/，确保纯 CSS / @source 改动也触发重建。
 */
const isWatch = process.argv.includes('--watch');

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  target: 'es2023',
  dts: false,
  clean: false,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  jsx: 'automatic',
  watch: isWatch ? ['src'] : false,
  async onSuccess() {
    const srcCss = path.join(process.cwd(), 'src', 'styles.css');
    const distCss = path.join(process.cwd(), 'dist', 'styles.css');
    await fs.promises.mkdir(path.dirname(distCss), { recursive: true });
    await fs.promises.copyFile(srcCss, distCss);
  },
});
