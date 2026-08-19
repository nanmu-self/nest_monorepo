#!/usr/bin/env node
// create-nest-monorepo —— 入口
//
// 用法：
//   node scripts/create/bin.mjs my-app
//   pnpm create nest-monorepo my-app
//   create-nest-monorepo my-app --scope @acme --git --install
//
// 流程：
//   1. 解析参数 / 问用户收集项目名、scope、description、author
//   2. 校验目标目录（拒绝 dest === cwd 的危险场景）
//   3. 拷贝模板 + 做 {{var}} 占位符替换
//   4. （可选）git init
//   5. （可选）pnpm install
//   6. 提示用户下一步
//
// 错误回滚策略：
//   - 拷贝或 git init 失败 → 回滚 destDir：目录原本非空（--force 写入）则保留不删，
//     原本不存在/为空则整个删除（粗粒度回滚）
//   - pnpm install 失败 → 不回滚（保留项目，用户大概率想看错误信息自己修）
//   - 用户传 . 或路径等同于 cwd → 拒绝执行（避免误删当前目录）

import { resolve } from 'node:path';
import { stat, mkdir, readdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { collectAnswers } from './lib/prompt.mjs';
import { scaffold } from './lib/copy.mjs';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};
const ok = (m) => `${c.green}✔${c.reset} ${m}`;
const info = (m) => `${c.dim}${m}${c.reset}`;
const warn = (m) => `${c.yellow}!${c.reset} ${m}`;
const step = (m) => `\n${c.cyan}→${c.reset} ${c.bold}${m}${c.reset}\n`;

/**
 * 在 cwd 下跑命令，把 stdout/stderr 流到当前进程。
 *
 * Windows 上 pnpm / git 是 .cmd 脚本。Node 18+ 出于安全考虑，
 * 默认拒绝 spawn .cmd（返回 EINVAL），必须在 shell: true 下启动。
 *
 * 副作用：Node 18–22 会发 DEP0190 DeprecationWarning
 * （"Passing args to a child process with shell option true ..."）。
 * 这是 Node 官方已知问题（nodejs/help#4231），不影响功能。
 */
function runCommand(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', (err) => {
      console.error(`${c.red}无法启动 ${cmd}: ${err.message}${c.reset}`);
      resolve(127);
    });
  });
}

async function dirExists(p) {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 检查 dest 是否安全：不能等于 cwd（避免误删当前目录）。
 * 严格比较 path.resolve 后的结果。
 */
function assertDestSafe(dest) {
  const cwd = resolve(process.cwd());
  // Windows 上 path.resolve 不区分大小写
  const isWin = process.platform === 'win32';
  const a = isWin ? dest.toLowerCase() : dest;
  const b = isWin ? cwd.toLowerCase() : cwd;
  if (a === b) {
    throw new Error(`目标目录不能是当前工作目录（${dest}）。请传入子目录名，如 my-app。`);
  }
  // 也要拒绝 dest 是 cwd 的祖先（极端情况）
  // —— 但实际上只有 dest === cwd 会引发 rm -rf 的灾难，祖先目录的可能性较低（用户主动传了绝对路径），先不处理。
}

/**
 * 回滚。preExisting = 目标目录在生成前就非空（--force 写入场景）：
 * 此时绝不能整目录删除，保留用户原有文件，只报告失败。
 */
async function rollback(dest, preExisting, reason) {
  if (preExisting) {
    console.warn(warn(`失败：${reason}`));
    console.warn(warn(`目标目录 ${dest} 原本非空，已保留（未删除你的原有文件）。`));
    return;
  }
  console.warn(warn(`回滚 ${dest}（${reason}）`));
  try {
    await rm(dest, { recursive: true, force: true });
  } catch (err) {
    console.error(`${c.red}回滚失败: ${err.message}${c.reset}`);
    console.error(`请手动删除 ${dest}`);
  }
}

async function main() {
  const { args, targetDir, vars } = await collectAnswers(process.argv.slice(2));
  const dest = resolve(process.cwd(), targetDir);

  assertDestSafe(dest);

  // 目标目录检查：非空目录需 --force；preExisting 记录"原本就非空"，
  // 回滚时用它保护用户原有文件不被整目录删除
  let preExisting = false;
  if (await dirExists(dest)) {
    const entries = await readdir(dest);
    preExisting = entries.length > 0;
    if (preExisting && !args.force) {
      throw new Error(`目标目录 ${dest} 已存在且非空。使用 --force 强制写入。`);
    }
  }

  if (args.dryRun) {
    console.log(warn('dry-run 模式，不会写入任何文件'));
    console.log(info('计划生成:'));
    console.log(info(`  目录: ${dest}`));
    console.log(info(`  变量: ${JSON.stringify({ ...vars, scopePath: undefined })}`));
    if (args.git) console.log(info('  之后: git init'));
    if (args.install) console.log(info('  之后: pnpm install'));
    return;
  }

  await mkdir(dest, { recursive: true });
  console.log(`\n${c.bold}生成项目到 ${dest}${c.reset}\n`);

  // ---- 阶段 1: scaffold（拷贝 + 替换）----
  try {
    await scaffold(vars, dest, {
      log: (m) => console.log(ok(m.replace(/^  \+ /, '')))
    });
  } catch (err) {
    await rollback(dest, preExisting, `scaffold 失败: ${err.message}`);
    throw err;
  }

  let installFailed = false;

  // ---- 阶段 2: git init ----
  if (args.git) {
    console.log(step('git init'));
    const code = await runCommand('git', ['init'], dest);
    if (code !== 0) {
      await rollback(dest, preExisting, 'git init 失败');
      throw new Error('git init 失败，已回滚生成的文件。确认 git 已安装且在 PATH 中。');
    }
    console.log(ok('git init 完成（未做首次提交，由你控制 commit 信息）'));
  }

  // ---- 阶段 3: pnpm install（不参与回滚，失败保留项目）----
  if (args.install) {
    console.log(step('pnpm install'));
    const code = await runCommand('pnpm', ['install'], dest);
    if (code !== 0) {
      installFailed = true;
      console.warn(warn('pnpm install 失败（项目已生成，可手动重跑 pnpm install）。'));
    } else {
      console.log(ok('pnpm install 完成'));
    }
  }

  // 收尾
  console.log(`\n${c.bold}完成!${c.reset} 下一步:\n`);
  console.log(`  ${info('cd')} ${targetDir}`);
  if (!args.install) console.log(`  ${info('pnpm install')}`);
  if (!args.git) console.log(`  ${info('git init')}    ${c.dim}# 可选${c.reset}`);
  console.log(`  ${info('pnpm dev')}\n`);

  if (!vars.scope) {
    console.log(warn('注意: scope 为空，生成的项目里各包将是裸名（无 @scope/ 前缀）。'));
    console.log(warn('      pnpm workspace 仍可工作，但 npm 发布会受限。'));
  }

  if (installFailed) process.exit(1);
}

main().catch((err) => {
  console.error(`${c.red}✖${c.reset} ${err.message}`);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});
