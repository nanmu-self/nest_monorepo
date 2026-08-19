#!/usr/bin/env node
// postpack: 清理 prepack 物化到 template/ 下的目录，恢复开发态。
//
// 由 prepack.mjs 写下的 node_modules/.prepack-state.json 驱动：
// 把物化出来的 template/apps、template/packages 删掉即可（它们不进 git）。
//
// 失败处理：如果 STATE_FILE 不存在，说明 pack 没经过 prepack（不应该发生），
// 直接 no-op 退出。

import { rm, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
// 与 prepack.mjs 保持一致：状态文件在 node_modules/ 下（不会进 npm 包）
const STATE_FILE = join(REPO_ROOT, 'node_modules', '.prepack-state.json');

async function main() {
  let state;
  try {
    state = JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('postpack: 无状态文件，跳过（pack 之前可能没跑 prepack）');
      return;
    }
    throw err;
  }

  for (const dir of state.materialized ?? []) {
    console.log(`postpack: removing ${dir}`);
    await rm(resolve(REPO_ROOT, dir), { recursive: true, force: true });
  }

  // 清理状态文件
  await rm(STATE_FILE);
  console.log('postpack: 完成');
}

main().catch((err) => {
  console.error('postpack failed:', err);
  console.error('提示: 手动清理: rm -rf template/apps template/packages node_modules/.prepack-state.json');
  process.exit(1);
});
