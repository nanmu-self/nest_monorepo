#!/usr/bin/env node
// prepack: 把 template/ 里的 symlink 替换成真实目录拷贝。
//
// 为什么需要：
//   template/apps 与 template/packages 是开发态的软链接（git 里 mode 120000）。
//   如果不处理，pnpm pack / npm pack 出来的 tarball 会保留 symlink，
//   用户安装后 symlink 指向的 ../apps 不存在 → 整个 CLI 不可用。
//
// 行为：
//   1. 遍历 template/ 下所有 symlink
//   2. 把 symlink 删掉，cp 真实目录过来
//   3. 把"原 symlink 目标"写到 .prepack-state.json，postpack 用它恢复
//
// 注意：
//   - 本地开发时（不是 pack 期间），template/ 保持 symlink 不变。
//   - 跑完 prepack 后，template/ 是真目录；postpack 会还原。
//   - 如果 postpack 失败（比如 SIGKILL），template/ 会留真目录，
//     手动 `git checkout -- template/` 恢复。
//
// 触发：package.json#scripts.prepack，被 pnpm/npm 自动在 pack 前调用。

import { readlink, rm, cp, writeFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const TEMPLATE_DIR = join(REPO_ROOT, 'template');
const STATE_FILE = join(REPO_ROOT, '.prepack-state.json');

/** 找 template/ 下所有 symlink（仅第一层；template/ 的 symlink 都是顶层） */
async function findSymlinks(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return out;
    throw err;
  }
  for (const e of entries) {
    if (e.isSymbolicLink()) out.push(e.name);
  }
  return out;
}

async function main() {
  const symlinks = await findSymlinks(TEMPLATE_DIR);
  if (symlinks.length === 0) {
    console.log('prepack: template/ 下没有 symlink，无需处理');
    return;
  }

  const state = { replaced: [] };
  for (const name of symlinks) {
    const linkPath = join(TEMPLATE_DIR, name);
    const target = await readlink(linkPath); // 相对路径，相对于 TEMPLATE_DIR
    const absoluteTarget = resolve(TEMPLATE_DIR, target);
    console.log(`prepack: dereferencing ${name} -> ${target}`);

    // 删 symlink，cp 真实目录过来。
    // filter 跳过 node_modules / dist / .tsbuildinfo / .git 等
    // （这些是开发态生成的，不应进 npm tarball）。
    await rm(linkPath);
    await cp(absoluteTarget, linkPath, {
      recursive: true,
      dereference: true,
      filter: (src) => {
        const base = src.split(/[\\/]/).pop();
        return !['node_modules', 'dist', '.git', '.tsbuildinfo', '.codegraph'].includes(base);
      }
    });
    state.replaced.push({ name, target });
  }

  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`prepack: 完成（已处理 ${symlinks.length} 个 symlink，状态写入 ${STATE_FILE}）`);
}

main().catch((err) => {
  console.error('prepack failed:', err);
  process.exit(1);
});
