import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

/**
 * Tailwind 配置包构建配置。
 *
 * 声明文件由 `tsc -p tsconfig.build.json` 生成。
 * styles.css 由 build 脚本手动复制到 dist/。
 */
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
  onSuccess: async () => {
    // 复制 CSS 文件到 dist
    const srcCss = path.join(process.cwd(), 'src', 'styles.css');
    const distCss = path.join(process.cwd(), 'dist', 'styles.css');
    await fs.promises.mkdir(path.dirname(distCss), { recursive: true });
    await fs.promises.copyFile(srcCss, distCss);
  },
});
