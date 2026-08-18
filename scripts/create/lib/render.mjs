// 占位符替换。
//
// 设计：
//   - 文本文件读进来后做 {{var}} → value 的全局替换。
//   - 占位符语法必须是完整 {{name}}，避免误伤代码里偶然出现的花括号。
//   - 未知占位符直接抛错（而不是静默保留），让模板漏洞尽早暴露。
//   - 支持别名映射（aliases）：比如把源码里写死的 @app/ 整体替换成 {{scope}}/。
//     别名先做，再做 {{var}}，所以别名里也能引用占位符。

import { readFile } from 'node:fs/promises';

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * 把文本里的 {{var}} 全部替换成 vars[var]。
 * @param {string} text
 * @param {Record<string, string>} vars
 */
export function renderText(text, vars, aliases = []) {
  // 1. 别名替换（每个别名是一个 [from, to] 对）
  let out = text;
  for (const [from, to] of aliases) {
    if (from && to !== undefined) {
      out = out.split(from).join(to);
    }
  }
  // 2. {{var}} 替换
  out = out.replace(PLACEHOLDER_RE, (match, name) => {
    if (!(name in vars)) {
      throw new Error(`未知占位符: ${match}（vars 里没有 "${name}"）`);
    }
    return vars[name];
  });
  return out;
}

/**
 * 读一个文件，做替换，写回（write 由调用方负责）。
 * 这里只返回渲染后的字符串。
 */
export async function renderFile(filePath, vars, aliases) {
  const raw = await readFile(filePath, 'utf8');
  return renderText(raw, vars, aliases);
}
