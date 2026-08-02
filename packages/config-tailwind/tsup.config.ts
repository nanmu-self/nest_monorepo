import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

/**
 * Tailwind 配置包构建配置。
 *
 * 声明文件由 `tsc -p tsconfig.build.json` 生成。
 * styles.css 由 onSuccess 复制到 dist/；watch 模式下额外启动
 * fs.watch 监听 styles.css，因为 CSS 不在 tsup 的依赖图里，
 * 仅改 CSS 不会触发重建。
 */
const srcCss = path.join(process.cwd(), 'src', 'styles.css');
const distCss = path.join(process.cwd(), 'dist', 'styles.css');

async function copyCss() {
  await fs.promises.mkdir(path.dirname(distCss), { recursive: true });
  await fs.promises.copyFile(srcCss, distCss);
}

let cssWatcher: fs.FSWatcher | undefined;

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
  async onSuccess() {
    await copyCss();

    // watch 模式下，styles.css 不在 tsup 依赖图中，需自行监听
    if (!cssWatcher && process.argv.includes('--watch')) {
      cssWatcher = fs.watch(srcCss, { persistent: true }, () => {
        void copyCss();
      });
    }
  },
});