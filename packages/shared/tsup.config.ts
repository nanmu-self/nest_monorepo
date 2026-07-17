import { defineConfig } from 'tsup';

/**
 * 只输出 ESM（monorepo 内消费方全部使用 ESM）。
 *
 * 声明文件由 `tsc -p tsconfig.build.json` 生成，与 project references 一致。
 *
 * 不启用 `clean` —— tsup 与 tsc 都往同一个 `dist/` 写，
 * 一方清理会误删另一方的产物。清理动作由 `build` 脚本在入口处统一完成。
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'http/index': 'src/http/index.ts',
  },
  format: ['esm'],
  target: 'es2023',
  dts: false,
  clean: false,
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
