import { defineConfig } from 'tsup';

/**
 * 只输出 ESM（monorepo 内消费方全部使用 ESM）。
 *
 * 声明文件由 `tsc -p tsconfig.build.json` 生成，与 project references 一致，
 * 避免 tsup 内嵌的 rollup-plugin-dts 在多 entry / composite 场景下踩坑。
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'http/index': 'src/http/index.ts',
  },
  format: ['esm'],
  target: 'es2023',
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
