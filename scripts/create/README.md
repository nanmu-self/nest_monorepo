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

`pnpm pack` 出来的 tarball 只包含 `files` 字段列出的 5 项:

- `scripts/create/`
- `template/`
- `template.manifest.json`
- `README.md`
- `LICENSE`

`node_modules/`、`.git/`、`apps/` 真实目录（被软链接 dereference 后才进 tarball —— 但因为它们在 `template/` 下是 symlink,而 `template` 整体被打包,symlink 在 tarball 里保留为 symlink,解压时仍指向不存在的 `../apps`,所以是安全的;**但这意味着发布后用户拷出来的 `apps/` 会是个坏 symlink** —— 这点要注意,见下方"已知陷阱"）

## 已知陷阱

### 软链接在 tarball 里的行为

`pnpm pack` 把 `template/apps` 这个 symlink 打进 tarball。**发布到 npm 后**,用户装包,npm 解压时这个 symlink 会变成相对路径 `../apps` —— 但用户的当前目录结构里没有 `apps`,所以会断。

**现在的应对**:CLI 跑的时候用 `fs.cp` 配 `dereference: true`,会把 symlink 解开成真实文件树。这条路在本地(从仓库根直接跑)能工作,但发布到 npm 后用户 `pnpm create` 时,CLI 源码会从 `node_modules/create-nest-monorepo/template/` 读,而 `template/apps` symlink 的目标 `../apps` 不存在 —— `stat` 会报 ENOENT。

**建议(暂未实现)**:发布前用脚本把 `template/apps` 和 `template/packages` 从 symlink 换成真实目录拷贝。可以用 `pnpm pack` 后 sed 改 tarball,或者在 `prepack` 钩子里临时 dereference。

**当前状态**:本地使用(`node scripts/create/bin.mjs my-app`)完美工作。npm 发布后用户使用时,需要先 `pnpm pack` 本地看一下 `template/apps` 在产物里是不是 symlink,如果是,加一个 `prepack` 脚本来处理。

## TODO（后续优化方向）

- [ ] 加 `prepack` 脚本,发布前把 `template/{apps,packages}` 从 symlink 转成真实拷贝
- [ ] 可选模块系统(让用户选要不要 Tailwind 包 / Prisma / 鉴权等)
- [x] `--git` 选项：生成完自动 `git init`（不做 commit）
- [x] `--install` 选项：生成完直接 `pnpm install`
- [ ] 错误恢复:写到一半失败时回滚已生成的文件
