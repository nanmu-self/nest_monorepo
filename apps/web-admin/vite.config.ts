import { defineConfig, loadEnv } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
import babel from '@rolldown/plugin-babel';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // UnoCSS 必须放在 react 之前，确保虚拟模块在 babel 编译前注入
    plugins: [UnoCSS(), react(), babel({ presets: [reactCompilerPreset()] })],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_SERVER_URL ?? 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
