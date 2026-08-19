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

# 不要 scope（各包用裸名，如 server）
node scripts/create/bin.mjs my-app --no-scope

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
├── apps/        # prepack 物化：pack 前从仓库根拷入（不进 git，见 .gitignore）
├── packages/    # 同上
├── gitignore    # 注意不是 .gitignore -- npm install 会把包根的 .gitignore 改名成
│                # .npmignore，CLI 会因找不到源文件而崩，所以存成 template/gitignore，
│                # 靠 manifest 的 dest 映射回 .gitignore
├── npmrc        # 同理：npm pack 永久排除 .npmrc，存成 template/npmrc 映射回 .npmrc
└── package.json # 根 package.json 模板,带 {{var}}
```

`template.manifest.json` 是清单,CLI 按它决定拷什么、跳什么、替换什么。

## 替换机制（两轮）

1. **别名替换**（先做）—— 来自 manifest 的 `aliases`,比如 `["@app/", "{{scopePath}}"]`,
   把源码里写死的 `@app/server` 整体换成 `<scopePath>server`。
2. **`{{var}}` 占位符**（后做）—— 来自 manifest 的 vars（`projectName`、`scope`、`scopePath`、`description`、`author`）,
   处理 `template/package.json` 这种明写占位符的地方。

`scopePath` = `scope + '/'`（如 `@acme/`），空 scope 时是空串：`@app/server` 渲染成
`@acme/server` 或裸名 `server`，都不会残留多余的斜杠（此前用 `{{scope}}/` 会在空 scope
时留下 `/server`）。

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

不需要改 template/ -- prepack 在 pack 前把仓库根的 `apps/`、`packages/` 物化到
`template/` 下。本地直跑 CLI 验证前先执行 `node scripts/prepack.mjs`（开发态
template/ 下没有这两棵树），验证完 `node scripts/postpack.mjs` 清理。

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

`pnpm pack` 出来的 tarball 包含 `files` 字段列出的项（根配置文件 + scripts + template + 清单）:

- `.editorconfig`、`.gitattributes`、`.oxlintrc.json`、`.prettierignore`、`.prettierrc.json`
- `docker-compose.yml`、`pnpm-workspace.yaml`、`tsconfig.base.json`、`tsconfig.json`
- `LICENSE`、`README.md`
- `scripts/create/`、`scripts/clean.mjs`、`scripts/prepack.mjs`、`scripts/postpack.mjs`
- `template/`（prepack 后含物化的 apps/packages 真目录）
- `template.manifest.json`

`node_modules/`、`.git/`、`dist/`、`*.tsbuildinfo`、`.env` 密钥文件都被 prepack 的 filter 跳过，不进 tarball。

`prepack` 钩子在 pack 前自动把仓库根的 `apps/`、`packages/` 拷进 `template/`（物化，跳过构建产物），`postpack` 钩子删除它们还原开发态，状态文件在 `node_modules/.prepack-state.json`（npm pack 永久排除 node_modules，所以不会进包）。`package.json#scripts` 里声明了这两个钩子，pnpm pack 会自动调用。

## 错误回滚

- 拷贝或 git init 阶段失败 → 整个 `destDir` 被删，退出码非零
- pnpm install 阶段失败 → **不**回滚，项目保留，退出码非零（用户大概率想看错误信息自己修）
- `destDir` 等于 `process.cwd()` → 拒绝执行（避免误删当前目录），退出码非零

## 已知陷阱

### .npmrc 进不了 tarball

npm pack **永久排除**名为 `.npmrc` 的文件（无论 `files` 白名单怎么写，防 registry 配置泄漏）。
模板又必须带 .npmrc，所以存成 `template/npmrc`，靠 manifest 的 `dest` 映射回 `.npmrc`。

### .gitignore 安装后被改名

`.gitignore` 能进 tarball，但 **npm install 解压时会把包根的 `.gitignore` 改名成 `.npmignore`**（内容不变，npm/pnpm pack 的 tarball 都这样；嵌套目录里的 .gitignore 则直接丢弃）。CLI 按清单读源文件会 ENOENT 崩溃。所以同样存成 `template/gitignore`，靠 `dest` 映射回 `.gitignore`。

仓库自身另有一份根 `.gitignore`（仅本仓库用，不在 `files` 白名单里，不进 tarball），
负责忽略仓库自己的 `node_modules/`、Prisma `generated/`、物化产物等；改忽略规则时两份需同步。

### Windows 上 symlink 不可靠

git 在 Windows 上（默认无 SeCreateSymbolicLinkPrivilege）把 symlink checkout 成
含目标路径文本的普通文件；CI/协作者克隆后 `template/apps` 不是链接而是几字节的
文本文件，symlink 方案直接失效。

**解决方案**：放弃 symlink，`scripts/prepack.mjs` 在 pack 前把仓库根的 `apps/`、
`packages/` **物化**（真实拷贝）到 `template/` 下，`scripts/postpack.mjs` 删除还原。
物化目录已被 `.gitignore` 忽略，不进 git。

如果 `postpack` 失败（比如 SIGKILL），手动清理：
`rm -rf template/apps template/packages node_modules/.prepack-state.json`。


## TODO（后续优化方向）

- [x] 加 `prepack` 脚本，发布前把仓库根 `apps/`、`packages/` 物化到 `template/` 下
- [x] `--no-scope`：空 scope 支持，别名替换用 `scopePath`（scope+斜杠或空串）避免残留斜杠
- [x] `--git` 选项：生成完自动 `git init`（不做 commit）
- [x] `--install` 选项：生成完直接 `pnpm install`
- [x] 错误恢复：拷贝/git init 失败时回滚已生成的文件；install 失败不参与回滚
- [ ] 可选模块系统（让用户选要不要 Tailwind 包 / Prisma / 鉴权等）
