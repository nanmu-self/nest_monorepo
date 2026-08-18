#!/usr/bin/env node
// postpack: 恢复 template/ 里的 symlink。
//
// 由 prepack.mjs 写下的 .prepack-state.json 驱动：把被替换的真目录删掉，
// 用原始的相对路径重建 symlink，让 git 工作区回到开发态。
//
// 失败处理：如果 STATE_FILE 不存在，说明 pack 没经过 prepack（不应该发生），
// 直接 no-op 退出。

import { rm, readFile, symlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const TEMPLATE_DIR = join(REPO_ROOT, 'template');
const STATE_FILE = join(REPO_ROOT, '.prepack-state.json');

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

  for (const { name, target } of state.replaced ?? []) {
    const linkPath = join(TEMPLATE_DIR, name);
    console.log(`postpack: restoring symlink ${name} -> ${target}`);
    // 先删真目录（force: true 容错删空目录或残留）
    await rm(linkPath, { recursive: true, force: true });
    // 重建 symlink（target 是相对路径，相对于 symlink 所在目录 TEMPLATE_DIR）
    await symlink(target, linkPath);
  }

  // 清理状态文件
  await rm(STATE_FILE);
  console.log('postpack: 完成');
}

main().catch((err) => {
  console.error('postpack failed:', err);
  console.error('提示: 手动恢复: rm -rf template/apps template/packages && ln -s ../apps template/apps && ln -s ../packages template/packages');
  process.exit(1);
});
