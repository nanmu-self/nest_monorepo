// 把模板文件拷到目标目录。
//
// 步骤：
//   1. 读 template.manifest.json
//   2. 对清单里的单文件：拷贝 + （如果是文本）做占位符替换
//   3. 对清单里的目录：递归拷贝，跳过 skipInDirs
//
// 软链接处理：fs.cp 传 dereference: true，模板目录里的 symlink
// （如果存在）会被解开成真实目录树。开发态 template/ 下没有 apps/packages，
// 源目录缺失时跳过并警告（pack 后的包里才有真实内容）。

import { readFile, writeFile, mkdir, cp, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderText } from './render.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '..', '..', '..');
export const TEMPLATE_DIR = join(REPO_ROOT, 'template');
export const MANIFEST_PATH = join(REPO_ROOT, 'template.manifest.json');

/** 路径是否应该被跳过 */
function shouldSkip(name, skipList) {
  return skipList.some(
    (pat) => pat === name || (pat.startsWith('*.') && name.endsWith(pat.slice(1)))
  );
}

/**
 * 环境变量密钥文件：.env / .env.local / .env.production 等一律不拷贝，
 * 只放行 .env.example。硬编码兜底，不进 manifest（防止清单误配把密钥带进新项目）。
 */
function isEnvSecret(name) {
  return name === '.env' || (name.startsWith('.env.') && name !== '.env.example');
}

/**
 * 递归拷贝目录，跳过 skipList 里的名字与 .env 密钥文件。
 * 对文本类后缀做占位符替换；其它文件原样拷。
 */
async function copyDirFiltered(src, dest, vars, skipList, aliases = []) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldSkip(entry.name, skipList) || isEnvSecret(entry.name)) continue;
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      // dereference 由外层 fs.cp 处理；这里碰到 symlink 仍走 stat 后决定
      const realStat = await stat(s);
      if (realStat.isDirectory()) {
        await copyDirFiltered(s, d, vars, skipList, aliases);
      } else {
        await copyOneFile(s, d, vars, aliases);
      }
    } else if (entry.isFile()) {
      await copyOneFile(s, d, vars, aliases);
    }
  }
}

/** 单文件拷贝：文本做占位符替换，二进制直接拷 */
async function copyOneFile(src, dest, vars, aliases = []) {
  await mkdir(dirname(dest), { recursive: true });
  const buf = await readFile(src);
  const looksText = isProbablyText(buf, src);
  if (looksText) {
    const rendered = renderText(buf.toString('utf8'), vars, aliases);
    await writeFile(dest, rendered, 'utf8');
  } else {
    await writeFile(dest, buf);
  }
}

/** 简易文本/二进制判定：扩展名 + 头 8KB 是否含 NUL 字节 */
function isProbablyText(buf, filePath) {
  const textExts = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.json', '.md', '.mdx', '.css', '.scss',
    '.yml', '.yaml', '.html', '.svg', '.txt',
    '.sh', '.cjs', '.prisma', '.env', '.example',
    '.gitignore', '.gitattributes', '.npmrc', '.editorconfig'
  ]);
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && textExts.has(ext)) return true;
  // 兜底：扫前 8KB 找 NUL
  const head = buf.subarray(0, Math.min(buf.length, 8192));
  for (let i = 0; i < head.length; i++) {
    if (head[i] === 0) return false;
  }
  return true;
}

/**
 * 公开入口：把模板拷到 destDir。
 * @param {Record<string, string>} vars  占位符变量表
 * @param {string} destDir                目标根目录
 * @param {object} [opts]
 * @param {(msg: string) => void} [opts.log]  日志回调；缺省走 console.log
 */
export async function scaffold(vars, destDir, opts = {}) {
  const log = opts.log ?? console.log;
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));

  // 1. 单文件
  for (const f of manifest.files ?? []) {
    const src = join(REPO_ROOT, f.src);
    const dest = join(destDir, f.dest ?? f.src);
    if (f.kind === 'text') {
      const raw = await readFile(src, 'utf8');
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, renderText(raw, vars, manifest.aliases), 'utf8');
      log(`  + ${relative(destDir, dest)}`);
    } else {
      await cp(src, dest, { recursive: true });
      log(`  + ${relative(destDir, dest)}`);
    }
  }

  // 2. 目录（整段拷，里头走 filter）
  for (const d of manifest.dirs ?? []) {
    const src = join(REPO_ROOT, d.src);
    const dest = join(destDir, d.dest ?? d.src);
    try {
      await copyDirFiltered(src, dest, vars, manifest.skipInDirs ?? [], manifest.aliases);
      log(`  + ${relative(destDir, dest)}/`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 开发态源码直跑（未经 prepack）：template/apps 不存在。
        // pack 后的包里 prepack 已物化，不会走到这里。
        console.warn(`  ! 跳过 ${d.src}/（源目录不存在，本地直跑请先执行 node scripts/prepack.mjs）`);
        continue;
      }
      throw err;
    }
  }
}
