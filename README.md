# Nest Monorepo Template

基于 pnpm workspace 的全栈 monorepo 脚手架，内置 NestJS + React + Prisma，开箱即用。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 包管理 | pnpm workspace | 11 |
| 运行时 | Node.js | ≥ 22.12 |
| 语言 | TypeScript | 5.8 |
| 后端框架 | NestJS | 11 |
| 编译器 | SWC | - |
| ORM | Prisma | 7 |
| 数据库 | PostgreSQL | - |
| 前端框架 | React | 19 |
| 构建工具 | Vite | 8 |
| 前端编译 | React Compiler (Babel plugin) | - |
| 代码检查 | oxlint | - |
| 代码格式化 | Prettier | 3 |

## 前置要求

- [Node.js](https://nodejs.org/) ≥ 22.12
- [pnpm](https://pnpm.io/) ≥ 11（`corepack enable`）
- [PostgreSQL](https://www.postgresql.org/) 数据库实例

## 项目结构

```
nest_monorepo/
├── apps/
│   ├── server/                  # NestJS 后端服务
│   │   ├── prisma/
│   │   │   └── schema.prisma    # 数据库模型定义
│   │   ├── src/
│   │   │   ├── admins/          # 示例业务模块（controller / service / module）
│   │   │   ├── prisma/          # PrismaClient 封装（@Global 模块）
│   │   │   ├── app.module.ts    # 根模块
│   │   │   ├── bootstrap.ts     # 应用配置（全局前缀 / 版本控制 / CORS / 管道）
│   │   │   └── main.ts          # 入口
│   └── background/              # React 前端（管理后台）
│       ├── src/
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── vite.config.ts       # 含 /api dev proxy
├── packages/
│   └── shared/                  # 前后端共享类型与工具
│       └── src/index.ts
├── .vscode/                     # 编辑器推荐配置
├── .oxlintrc.json               # oxlint 规则（含 React override）
├── .prettierrc.json             # Prettier 格式化规则
├── .editorconfig                # 编辑器基础配置
├── tsconfig.base.json           # TypeScript 共享编译选项
├── tsconfig.json                # 根 Project References 入口
└── pnpm-workspace.yaml          # workspace 与构建脚本白名单
```

## 快速开始

```bash
# 1. 克隆项目
git clone <your-repo-url> my-project
cd my-project

# 2. 安装依赖（自动触发 prisma generate）
pnpm install

# 3. 配置环境变量
cp apps/server/.env.example apps/server/.env
cp apps/background/.env.example apps/background/.env
# 编辑 .env 文件，填入你的数据库连接串等

# 4. 初始化数据库
cd apps/server
pnpm migrate:create    # 生成并执行迁移
cd ../..

# 5. 启动开发服务
pnpm dev
```

启动后：

- 后端 API：`http://localhost:3000/api/v1`（同时支持 `/api/v2`）
- 前端页面：`http://localhost:5173`
- 前端通过 Vite proxy 代理 `/api` → 后端，无需处理跨域

## 可用脚本

在项目根目录执行：

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 并行启动前后端开发服务 |
| `pnpm build` | 构建所有 workspace 包 |
| `pnpm lint` | oxlint 检查全部代码 |
| `pnpm lint:fix` | oxlint 自动修复 |
| `pnpm format` | Prettier 格式化全部文件 |
| `pnpm format:check` | 检查格式是否合规 |
| `pnpm typecheck` | TypeScript Project References 增量类型检查 |
| `pnpm clean` | 清理所有 dist 和 .tsbuildinfo |

`apps/server` 内额外可用：

| 命令 | 说明 |
|------|------|
| `pnpm migrate:create` | 创建并执行数据库迁移 |
| `pnpm db:pull` | 从现有数据库反向生成 schema |

## 环境变量

### `apps/server/.env`

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | - |
| `PORT` | 服务监听端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `CORS_ORIGIN` | CORS 允许来源（逗号分隔） | `true`（允许所有） |

### `apps/background/.env`

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_SERVER_URL` | Vite dev proxy 目标地址 | `http://localhost:3000` |

## 数据库 (Prisma)

项目使用 Prisma 7，schema 定义在 `apps/server/prisma/schema.prisma`。

**Prisma 7 的关键变化**：数据库 URL 不再在 `schema.prisma` 中通过 `env()` 声明，而是通过 `prisma.config.ts` 动态注入。这样可以在不同环境间灵活切换连接配置。

常用操作：

```bash
cd apps/server

# 修改 schema.prisma 后创建迁移
pnpm migrate:create --name your_migration_name

# 从现有数据库反向同步 schema
pnpm db:pull
```

生成的 Prisma Client 输出到 `src/generated/prisma/`，已被 `.gitignore` 忽略，安装依赖时通过 `postinstall` 自动生成。

## 架构设计要点

### TypeScript Project References

根 `tsconfig.json` 通过 `references` 引用所有子项目，每个子项目设置了 `composite: true`。运行 `pnpm typecheck` 时 TypeScript 会增量编译，只检查有变化的部分。

### PrismaModule 全局化

`PrismaModule` 标记为 `@Global()`，在根模块注册一次后，所有模块可直接注入 `PrismaService`，无需重复 import。

### 应用配置复用

`bootstrap.ts` 导出 `setupApp()` 函数，统一管理全局前缀、URI 版本控制、CORS、ValidationPipe 等配置。`main.ts` 调用该函数完成应用初始化，保持入口文件简洁。

### API 版本控制

通过 `enableVersioning({ type: VersioningType.URI, defaultVersion: ['1', '2'] })` 启用 URI 版本控制。所有未显式声明 `@Version()` 的路由会同时在 `/api/v1/` 和 `/api/v2/` 下可用。需要对某个路由做破坏性变更时，在 Controller 上用 `@Version('2')` 声明，v1 保留旧逻辑。

### 前后端 API 代理

开发模式下，Vite dev server 将 `/api` 请求代理到 NestJS 后端。前端代码只需请求 `/api/xxx`，无需关心后端端口。

### 代码规范

- **oxlint**：极速 linter，规则配置在 `.oxlintrc.json`，针对 `apps/background` 自动启用 React 插件
- **Prettier**：统一格式化，配置在 `.prettierrc.json`
- **EditorConfig**：跨编辑器基础缩进/换行约定

## 许可证

[MIT](./LICENSE)