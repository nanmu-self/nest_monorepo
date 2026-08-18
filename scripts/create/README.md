# create-nest-monorepo

把当前仓库当模板,生成一份新的 pnpm + NestJS + React monorepo。

## 快速使用

```bash
# 本地开发（直接调源码,免发布）
node scripts/create/bin.mjs my-app

# 走交互（不带参数会问目标目录、项目名、scope、description、author）
node scripts/create/bin.mjs

# 全部用默认值（适合 CI）
node scripts/create/bin.mjs my-app --yes

# 别名替换 scope
node scripts/create/bin.mjs my-app --scope @acme

# 只看计划,不动文件
node scripts/create/bin.mjs my-app --dry-run

# 生成后自动 git init
node scripts/create/bin.mjs my-app --git

# 生成后自动装包
node scripts/create/bin.mjs my-app --install

# 一步到位：生成 + git init + pnpm install
node scripts/create/bin.mjs my-app --git --install
```

发布到 npm 后,调用方变成:

```bash
pnpm create nest-monorepo my-app
# 或
npx create-nest-monorepo my-app
```

## 文件结构

```
scripts/create/
├── bin.mjs          # 入口（被根 package.json#bin 引用）
├── lib/
│   ├── render.mjs   # 占位符 {{var}} + 别名替换
│   ├── copy.mjs     # 文件拷贝 + 跳过 + 过滤
│   └── prompt.mjs   # 交互问答 + 参数解析
└── README.md        # 本文件
```

`template/` 目录是模板快照:

```
template/
├── apps/        -> ../apps       (软链接,改源码自动同步)
├── packages/    -> ../packages   (软链接,改源码自动同步)
└── package.json                 (根 package.json 模板,带 {{var}})
```

`template.manifest.json` 是清单,CLI 按它决定拷什么、跳什么、替换什么。

## 替换机制（两轮）

1. **别名替换**（先做）—— 来自 manifest 的 `aliases`,比如 `["@app/", "{{scope}}/"]`,
   把源码里写死的 `@app/server` 整体换成 `<用户 scope>/server`。
2. **`{{var}}` 占位符**（后做）—— 来自 manifest 的 vars（`projectName`、`scope`、`description`、`author`）,
   处理 `template/package.json` 这种明写占位符的地方。

别名右值可以引用占位符,顺序就是上面这样。如果将来要加新别名,改 `template.manifest.json` 的 `aliases` 段即可。

## 改了模板以后怎么验证

```bash
# 1. 跑 dry-run 看计划
pnpm run create:dry

# 2. 实际生成到 /tmp/cnm-test,装包 + typecheck
pnpm run create:test
cd /tmp/cnm-test && pnpm install && pnpm typecheck

# 3. 跑 dev 确认 server / web-admin 都能起
cd /tmp/cnm-test && pnpm dev
```

如果改了 `template/package.json` 或 `template.manifest.json` 的 `aliases`,必须重跑上面的 2、3 两步。

## 改了 apps/ 或 packages/ 里的代码

不需要任何操作 —— `template/apps` 和 `template/packages` 是软链接,源码改完模板自动跟随。

## 加了新文件到模板

- 新顶层文件（如 `Dockerfile`）:在 `template.manifest.json` 的 `files` 数组里加一行,`kind: "text"` 表示要走占位符替换
- 新目录:在 `dirs` 数组里加一条
- 跳过的目录名:加到 `skipInDirs` 数组
- 新的别名替换（比如要把 `xxx-org` 也整体替换）:加到 `aliases` 数组

## 发布到 npm

```bash
# 1. 看产物对不对
pnpm pack

# 2. 登录 + 发布（包名 create-nest-monorepo 在 npm 上需未被占用）
npm login
npm publish --access public
```

`pnpm pack` 出来的 tarball 包含 `files` 字段列出的项:

- `scripts/create/`
- `scripts/prepack.mjs`、`scripts/postpack.mjs`
- `template/`（prepack 后是真目录）
- `template.manifest.json`
- `README.md`
- `LICENSE`

`node_modules/`、`.git/`、`dist/`、`.tsbuildinfo` 都被 prepack 的 filter 跳过，不进 tarball。

`prepack` 钩子在 pack 前自动把 `template/{apps,packages}` 从 symlink 转成真实目录拷贝（跳过 `node_modules` 等），`postpack` 钩子还原。`package.json#scripts` 里声明了这两个钩子，pnpm pack 会自动调用。

## 错误回滚

- 拷贝或 git init 阶段失败 → 整个 `destDir` 被删，退出码非零
- pnpm install 阶段失败 → **不**回滚，项目保留，退出码非零（用户大概率想看错误信息自己修）
- `destDir` 等于 `process.cwd()` → 拒绝执行（避免误删当前目录），退出码非零

## 已知陷阱

### 软链接在 tarball 里的行为

`pnpm pack` 把 `template/apps` 这个 symlink 打进 tarball。**发布到 npm 后**，用户装包，npm 解压时这个 symlink 会变成相对路径 `../apps` —— 但用户的当前目录结构里没有 `apps`，所以会断。

**解决方案**：`scripts/prepack.mjs` 在 pack 前把 symlink 替换成真实目录拷贝（跳过 `node_modules` / `dist` / `.tsbuildinfo`），pack 完 `scripts/postpack.mjs` 还原成 symlink。`package.json#scripts` 里声明了 `prepack` / `postpack` 钩子，pnpm pack 会自动调用。

如果 `postpack` 失败（比如 SIGKILL），`template/` 会留真目录占着，手动 `git checkout -- template/` 恢复。

## TODO（后续优化方向）

- [x] 加 `prepack` 脚本，发布前把 `template/{apps,packages}` 从 symlink 转成真实拷贝
- [x] `--git` 选项：生成完自动 `git init`（不做 commit）
- [x] `--install` 选项：生成完直接 `pnpm install`
- [x] 错误恢复：拷贝/git init 失败时回滚已生成的文件；install 失败不参与回滚
- [ ] 可选模块系统（让用户选要不要 Tailwind 包 / Prisma / 鉴权等）
