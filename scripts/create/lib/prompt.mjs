// 交互问答。
//
// 决策：
//   - 零依赖（不引入 prompts / clack），用 node:readline 自己实现，
//     这样 create-nest-monorepo 这个包发布时不需要任何运行时依赖。
//   - 如果 stdin 不是 TTY（CI、管道）或者传了 --yes / --no-input，直接用默认值。
//
// 校验：
//   - projectName 必须是合法 npm 包名（lowercase、可以有 -、不能以 -/_ 开头）
//   - scope 默认从 projectName 推导，形式为 @<projectName>

import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

const NPM_NAME_RE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const SCOPE_RE = /^@[a-z0-9-~][a-z0-9-._~]*$/;
// 交互时用户输入这些词表示"不要 scope"（--no-scope 的交互等价物）
const NO_SCOPE_INPUT = new Set(['-', 'none', 'no', '()']);

/**
 * 从 argv 解析 CLI 参数。
 * 约定：第一个非 flag 位置参数是目标目录；--name/--scope/--description/--author 覆盖提示。
 */
export function parseArgs(argv) {
  const args = { _: [], name: undefined, scope: undefined, description: undefined, author: undefined, yes: false, dryRun: false, force: false, git: false, install: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--name': args.name = argv[++i]; break;
      case '--scope': args.scope = argv[++i]; break;
      case '--no-scope': args.scope = ''; break;
      case '--description': args.description = argv[++i]; break;
      case '--author': args.author = argv[++i]; break;
      case '--yes':
      case '-y': args.yes = true; break;
      case '--dry-run': args.dryRun = true; break;
      case '--force': args.force = true; break;
      case '--git': args.git = true; break;
      case '--install': args.install = true; break;
      case '--help':
      case '-h': args.help = true; break;
      default:
        if (a.startsWith('-')) {
          throw new Error(`未知选项: ${a}`);
        }
        args._.push(a);
    }
  }
  return args;
}

function printHelp() {
  console.log(`create-nest-monorepo — 从模板生成 pnpm + NestJS + React monorepo

用法:
  create-nest-monorepo [目标目录] [选项]

选项:
  --name <name>            项目名（默认: 目录名）
  --scope <@scope>         npm scope，例如 @acme（默认: @<name>）
  --no-scope               不要 scope，各包用裸名（如 server 而非 @scope/server）
  --description <text>     描述（可空）
  --author <name>          作者（可空）
  -y, --yes                全部使用默认值，不交互
  --force                  目标目录已存在时强制写入
  --dry-run                只打印计划，不实际生成
  --git                    生成后 git init（不提交）
  --install                生成后 pnpm install（需 pnpm 在 PATH 中）
  -h, --help               显示帮助

示例:
  create-nest-monorepo my-app
  create-nest-monorepo my-app --scope @acme --description "博客后台"
  pnpm create nest-monorepo my-app
`);
}

function ask(rl, question, defaultValue) {
  return new Promise((resolve) => {
    const hint = defaultValue ? ` [${defaultValue}]` : '';
    rl.question(`${question}${hint}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function deriveDefaults(raw) {
  // 目录名 = path 最后一段，转成合法 npm 名
  const base = (raw.split(/[\\/]/).pop() || 'my-app')
    .toLowerCase()
    .replace(/[^a-z0-9-._~]/g, '-')
    .replace(/^[-._]+/, '')
    .replace(/[-._]+$/, '') || 'my-app';
  return { name: base, scope: `@${base}` };
}

function validateName(name) {
  if (!name) return '项目名不能为空';
  if (!NPM_NAME_RE.test(name)) return `项目名 "${name}" 不是合法 npm 包名（小写字母/数字/-_.~，可带 scope）`;
  return null;
}

function validateScope(scope) {
  if (!scope) return null; // scope 允许空 —— 用户用裸名也合法
  if (!SCOPE_RE.test(scope)) return `scope "${scope}" 不合法，应为 @xxx 形式`;
  return null;
}

/**
 * 主入口：返回 { targetDir, vars } 或抛出。
 */
export async function collectAnswers(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // 目标目录：第一个位置参数；没有则问
  let target = args._[0];
  const isTTY = stdin.isTTY;
  const useDefaults = args.yes || !isTTY;

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    if (!target) {
      target = await ask(rl, '目标目录', 'my-app');
    }

    const derived = deriveDefaults(target);

    let name = args.name;
    let scope = args.scope;
    let description = args.description ?? '';
    let author = args.author ?? '';

    if (!name) {
      name = useDefaults ? derived.name : await ask(rl, '项目名', derived.name);
    }
    if (scope === undefined) {
      const def = derived.scope;
      if (useDefaults) {
        scope = def;
      } else {
        const input = await ask(rl, 'npm scope（输入 - 表示不要 scope）', def);
        scope = NO_SCOPE_INPUT.has(input.toLowerCase()) ? '' : input;
      }
    }
    if (!useDefaults) {
      description = await ask(rl, '描述（可空）', '');
      author = await ask(rl, '作者（可空）', '');
    }
    if (!args.description) description = description || '';
    if (!args.author) author = author || '';

    // 校验（scope 为空串 = 用户明确不要 scope，跳过格式校验）
    const nameErr = validateName(name);
    if (nameErr) throw new Error(nameErr);
    if (scope !== '') {
      const scopeErr = validateScope(scope);
      if (scopeErr) throw new Error(scopeErr);
    }

    return {
      args,
      targetDir: target,
      // scopePath: 模板别名用（@app/ -> {{scopePath}}）。= scope + '/'，含 @ 前缀；
      // 空 scope 时为空串，保证 @app/server 渲染成 @acme/server 或裸名 server，不残留多余斜杠
      vars: {
        projectName: name,
        scope,
        scopePath: scope ? scope + '/' : '',
        description,
        author
      }
    };
  } finally {
    rl.close();
  }
}
