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
//   2. 校验目标目录
//   3. 拷贝模板 + 做 {{var}} 占位符替换
//   4. （可选）git init
//   5. （可选）pnpm install
//   6. 提示用户下一步

import { resolve } from 'node:path';
import { stat, mkdir, access, readdir } from 'node:fs/promises';
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
 * 这是 Node 官方已知问题（nodejs/help#4231），不影响功能，
 * Node 官方推荐的变通方式就是现在这样：数组参数 + shell: true。
 * Node 23+ 会重设计 spawn() 彻底解决。
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

async function dirExistsAndEmpty(p) {
  try {
    const s = await stat(p);
    if (!s.isDirectory()) return false;
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { args, targetDir, vars } = await collectAnswers(process.argv.slice(2));
  const dest = resolve(process.cwd(), targetDir);

  // 目标目录检查
  const exists = await dirExistsAndEmpty(dest);
  if (exists && !args.force) {
    const entries = await readdir(dest);
    if (entries.length > 0) {
      throw new Error(`目标目录 ${dest} 已存在且非空。使用 --force 强制写入。`);
    }
  }

  if (args.dryRun) {
    console.log(warn('dry-run 模式，不会写入任何文件'));
    console.log(info('计划生成:'));
    console.log(info(`  目录: ${dest}`));
    console.log(info(`  变量: ${JSON.stringify(vars)}`));
    if (args.git) console.log(info('  之后: git init'));
    if (args.install) console.log(info('  之后: pnpm install'));
    return;
  }

  await mkdir(dest, { recursive: true });
  console.log(`\n${c.bold}生成项目到 ${dest}${c.reset}\n`);

  await scaffold(vars, dest, {
    log: (m) => console.log(ok(m.replace(/^  \+ /, '')))
  });

  let installFailed = false;

  // 4. git init（如果开了 --git）
  if (args.git) {
    console.log(step('git init'));
    const code = await runCommand('git', ['init'], dest);
    if (code !== 0) {
      console.warn(warn('git init 失败（已忽略）。确认 git 已安装且在 PATH 中。'));
    } else {
      console.log(ok('git init 完成（未做首次提交，由你控制 commit 信息）'));
    }
  }

  // 5. pnpm install（如果开了 --install）
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

  // 6. 收尾
  console.log(`\n${c.bold}完成!${c.reset} 下一步:\n`);
  console.log(`  ${info('cd')} ${targetDir}`);
  if (!args.install) {
    console.log(`  ${info('pnpm install')}`);
  }
  if (!args.git) {
    console.log(`  ${info('git init')}    ${c.dim}# 可选${c.reset}`);
  }
  console.log(`  ${info('pnpm dev')}\n`);

  if (!vars.scope || !vars.scope.startsWith('@')) {
    console.log(warn('注意: scope 为空，生成的项目里各包将是裸名（无 @scope/ 前缀）。'));
    console.log(warn('      pnpm workspace 仍可工作，但 npm 发布会受限。'));
  }

  // install 失败时退出码非零,让 CI 之类能感知
  if (installFailed) process.exit(1);
}

main().catch((err) => {
  console.error(`${c.red}✖${c.reset} ${err.message}`);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});
