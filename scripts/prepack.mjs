#!/usr/bin/env node
// prepack: 把仓库根的 apps/ 与 packages/ 物化到 template/ 下，供 pack 打进 tarball。
//
// 为什么需要：
//   开发态 template/ 下没有 apps/packages 的真实内容（不进 git，见 .gitignore）。
//   CLI 从 template/ 拷贝模板，所以 pack 前必须先把这两棵树复制进 template/。
//
// 行为：
//   1. 读 template.manifest.json 的 dirs 段（src = template/ 下的目标，dest = 仓库根的源）
//   2. 把仓库根的 apps/、packages/ 拷到 template/ 下（跳过 skipInDirs 列的目录，
//      以及 .env 密钥文件 -- 与 copy.mjs 的硬编码兜底一致）
//   3. 状态文件写在 template/ 外（node_modules/.prepack-state.json），不进 npm 包；
//      postpack 用它清理
//
// 注意：
//   - 跑完 prepack 后 template/ 下多出的真目录已被 .gitignore 忽略，
//     postpack 会删除它们还原开发态。
//   - 如果 postpack 失败（比如 SIGKILL），手动清理：
//     rm -rf template/apps template/packages node_modules/.prepack-state.json
//
// 触发：package.json#scripts.prepack，被 pnpm/npm 自动在 pack 前调用。

import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const MANIFEST_PATH = join(REPO_ROOT, 'template.manifest.json');
// 状态文件放 node_modules/ 下：npm pack 永久排除 node_modules，
// 这样它绝不会被打进 tarball（此前放 template/ 下会泄漏进包里）
const STATE_FILE = join(REPO_ROOT, 'node_modules', '.prepack-state.json');

/** 路径是否应该被跳过（字面量名 + *.ext 通配，与 copy.mjs 保持一致） */
function shouldSkip(name, skipList) {
  return skipList.some(
    (pat) => pat === name || (pat.startsWith('*.') && name.endsWith(pat.slice(1)))
  );
}

/** .env 密钥文件不进 tarball（硬编码兜底，与 copy.mjs 一致，不进 manifest） */
function isEnvSecret(name) {
  return name === '.env' || (name.startsWith('.env.') && name !== '.env.example');
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const skipList = manifest.skipInDirs ?? [];
  const materialized = [];

  for (const d of manifest.dirs ?? []) {
    // 注意 src/dest 的方向：清单站在 CLI 的视角（src 在 template/ 下），
    // prepack 是反方向 -- 从仓库根（dest）拷进 template/（src）
    const sourceDir = resolve(REPO_ROOT, d.dest);
    const targetDir = resolve(REPO_ROOT, d.src);

    let entries;
    try {
      entries = await readdir(sourceDir);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(`prepack: 源目录 ${d.dest}/ 不存在，跳过`);
        continue;
      }
      throw err;
    }
    if (entries.length === 0) {
      console.warn(`prepack: 源目录 ${d.dest}/ 为空，跳过`);
      continue;
    }

    console.log(`prepack: ${d.dest} -> ${d.src}`);
    // 先清掉上次可能残留的物化目录，保证幂等
    await rm(targetDir, { recursive: true, force: true });
    await cp(sourceDir, targetDir, {
      recursive: true,
      dereference: true,
      filter: (src) => {
        const base = src.split(/[\\/]/).pop();
        return !shouldSkip(base, skipList) && !isEnvSecret(base);
      }
    });
    materialized.push(d.src);
  }

  if (materialized.length === 0) {
    console.log('prepack: 无可物化目录，跳过');
    return;
  }

  await mkdir(dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify({ materialized }, null, 2));
  console.log(`prepack: 完成（物化 ${materialized.length} 个目录，状态写入 ${STATE_FILE}）`);
}

main().catch((err) => {
  console.error('prepack failed:', err);
  process.exit(1);
});
