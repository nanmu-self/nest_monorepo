#!/usr/bin/env node
// 清理所有 workspace 包的 build 产物。
//
// 跑法：从仓库根执行 `pnpm clean`（根 package.json 的 scripts 调用本文件），
// 或直接 `node scripts/clean.mjs`。
//
// 为什么不直接用 `pnpm -r exec node -e "require('fs')..."`：
//   根 `package.json` 设了 `"type": "module"`，而 packages/shared、
//   packages/ui、packages/config-tailwind 也都是 ESM 包；CJS 的
//   `require('fs')` 在这些包里会 ReferenceError。抽成 .mjs 后
//   全仓统一走 ESM import，跨 CJS/ESM 包都能跑。
//
// 清理范围：每个 workspace 下的 dist/ 与 .tsbuildinfo；
// 不动根目录的 node_modules 与 .tsbuildinfo（根走的是 tsc -b 增量，
// 自身不产 .tsbuildinfo）。

import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** 递归遍历一层（不进入 node_modules / .git） */
async function listDirs(root) {
  const out = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(full);
      out.push(...(await listDirs(full)));
    }
  }
  return out;
}

/** 静默删除（不存在不算错），最后给出处理摘要 */
async function removeIfExists(p) {
  try {
    const s = await stat(p);
    if (s.isDirectory()) {
      await rm(p, { recursive: true, force: true });
    } else {
      await rm(p, { force: true });
    }
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

async function main() {
  // 候选清理点：所有 workspace 子目录 + 仓库根
  const candidates = [REPO_ROOT, ...(await listDirs(REPO_ROOT))];
  const targets = ['dist', '.tsbuildinfo'];

  let removed = 0;
  for (const dir of candidates) {
    for (const name of targets) {
      const p = join(dir, name);
      if (await removeIfExists(p)) {
        console.log(`  - ${p}`);
        removed += 1;
      }
    }
  }
  console.log(`clean: removed ${removed} path(s)`);
}

main().catch((err) => {
  console.error('clean failed:', err);
  process.exit(1);
});
