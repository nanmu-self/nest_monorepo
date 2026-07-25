# Nest Monorepo Template

基于 pnpm workspace 的全栈 monorepo 脚手架，内置 NestJS + React 19 + Prisma 7 + Tailwind 4，开箱即用。

## ✨ 特性

- 🚀 **现代技术栈**：Node.js 22 + TypeScript 5.8 + SWC 极速编译
- 📦 **Monorepo 架构**：pnpm workspace + TypeScript Project References 增量构建
- 🎨 **样式系统**：Tailwind 4 + 共享设计 Token + shadcn 风格组件库
- 🔄 **全栈共享**：API 类型契约、HTTP 客户端、工具函数前后端复用
- 🛡️ **类型安全**：从数据库到前端完整类型链路
- ⚡ **开发体验**：React Compiler 优化 + oxlint 极速检查 + 热更新

## 技术栈

| 层级        | 技术                          | 版本    |
| ----------- | ----------------------------- | ------- |
| 包管理      | pnpm workspace                | 11      |
| 运行时      | Node.js                       | ≥ 22.12 |
| 语言        | TypeScript                    | 5.8     |
| 后端框架    | NestJS                        | 11      |
| 编译器      | SWC                           | -       |
| ORM         | Prisma                        | 7       |
| 数据库      | PostgreSQL                    | -       |
| 前端框架    | React                         | 19      |
| 构建工具    | Vite                          | 8       |
| 样式框架    | Tailwind CSS                  | 4       |
| 前端编译    | React Compiler (Babel plugin) | -       |
| HTTP 客户端 | Alova                         | 3       |
| 代码检查    | oxlint                        | -       |
| 代码格式化  | Prettier                      | 3       |

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
│   │   │   ├── filters/         # 全局异常过滤器
│   │   │   ├── guards/          # 认证/授权守卫
│   │   │   ├── interceptors/    # 响应转换拦截器
│   │   │   ├── middleware/      # 请求日志中间件
│   │   │   ├── prisma/          # PrismaClient 封装（@Global 模块）
│   │   │   ├── users/           # 示例业务模块
│   │   │   ├── app.module.ts    # 根模块
│   │   │   ├── bootstrap.ts     # 应用配置
│   │   │   └── main.ts          # 入口
│   │   ├── .env.example         # 环境变量模板
│   │   └── prisma.config.ts     # Prisma 7 动态配置
│   │
│   └── web-admin/               # React 前端（管理后台）
│       ├── src/
│       │   ├── api/             # API 调用封装
│       │   ├── layouts/         # 布局组件
│       │   ├── pages/           # 页面组件
│       │   ├── router/          # 路由配置（含守卫）
│       │   ├── lib/http.ts      # Alova 客户端实例
│       │   └── main.tsx
│       ├── .env.example
│       └── vite.config.ts
│
├── packages/
│   ├── shared/                  # 前后端共享包（子路径导出）
│   │   ├── src/
│   │   │   ├── contracts/       # API 类型契约（UserDTO, ApiResponse...）
│   │   │   ├── http/            # Alova createHttp 工厂函数
│   │   │   └── errors.ts        # 统一错误类
│   │   └── package.json
│   │       ├── exports["."]     # 仅导出类型和错误类（无副作用）
│   │       └── exports["./http"] # 导出 HTTP 客户端（含 alova 依赖）
│   │
│   ├── config-tailwind/         # 共享 Tailwind 配置
│   │   ├── src/
│   │   │   ├── theme.ts         # 设计 Token（色阶、字体、圆角）
│   │   │   └── styles.css       # @theme 和 @layer 定义
│   │   └── dist/                # 构建产物
│   │
│   └── ui/                      # 共享 UI 组件库
│       ├── src/
│       │   ├── components/ui/   # shadcn 风格组件
│       │   ├── lib/utils.ts     # cn() 类名合并工具
│       │   └── styles.css       # 基础样式
│       └── dist/
│
├── .vscode/                     # 编辑器推荐配置
├── .oxlintrc.json               # oxlint 规则（含 React override）
├── .prettierrc.json             # Prettier 格式化规则
├── tsconfig.base.json           # TypeScript 共享编译选项
├── tsconfig.json                # 根 Project References 入口
└── pnpm-workspace.yaml          # workspace 配置
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
cp apps/web-admin/.env.example apps/web-admin/.env
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
- 前端通过 Vite proxy 代理 `/api` -> 后端，无需处理跨域

## 可用脚本

在项目根目录执行：

| 命令                | 说明                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `pnpm dev`          | 并行启动所有包（shared + config-tailwind + ui + server + web-admin） |
| `pnpm build`        | 构建所有 workspace 包                                                |
| `pnpm lint`         | oxlint 检查全部代码                                                  |
| `pnpm lint:fix`     | oxlint 自动修复                                                      |
| `pnpm format`       | Prettier 格式化全部文件                                              |
| `pnpm format:check` | 检查格式是否合规                                                     |
| `pnpm typecheck`    | TypeScript Project References 增量类型检查                           |
| `pnpm clean`        | 清理所有 dist 和 .tsbuildinfo                                        |

`apps/server` 内额外可用：

| 命令                   | 说明                        |
| ---------------------- | --------------------------- |
| `pnpm migrate:create`  | 创建并执行数据库迁移        |
| `pnpm db:pull`         | 从现有数据库反向生成 schema |
| `pnpm db:comment:pull` | 拉取数据库字段注释          |

## 环境变量

### `apps/server/.env`

| 变量           | 说明                      | 默认值             |
| -------------- | ------------------------- | ------------------ |
| `DATABASE_URL` | PostgreSQL 连接字符串     | -                  |
| `PORT`         | 服务监听端口              | `3000`             |
| `NODE_ENV`     | 运行环境                  | `development`      |
| `CORS_ORIGIN`  | CORS 允许来源（逗号分隔） | `true`（允许所有） |

### `apps/web-admin/.env`

| 变量                | 说明                    | 默认值                  |
| ------------------- | ----------------------- | ----------------------- |
| `VITE_SERVER_URL`   | Vite dev proxy 目标地址 | `http://localhost:3000` |
| `VITE_API_BASE_URL` | 生产环境 API 基础路径   | `/api/v1`               |

## 架构设计要点

### 📦 Monorepo 包管理

所有 `packages/*` 均使用统一的构建流程：

- **tsup**：构建 ESM 格式 JS 产物，生成 sourcemap
- **tsc**：生成 `.d.ts` 类型声明文件（配合 Project References）
- **dist/**：唯一发布产物目录，禁止直接引用 src

### 🔄 Shared 包子路径导出

`@short-link/shared` 使用子路径导出避免不必要的依赖拉取：

```typescript
// ✅ 服务端只导入类型，不会引入 alova
import type { UserDTO, ApiResponse } from '@short-link/shared';

// ✅ 前端导入 HTTP 客户端工厂
import { createHttp } from '@short-link/shared/http';
```

### 🎨 样式系统

**`@short-link/config-tailwind`** - 共享设计系统：

- 定义品牌色阶、功能色、字体、圆角等设计 Token
- 导出 `styles.css` 内含 `@theme` 和 `@layer components`
- 消费方直接 import CSS 即可应用统一风格

**`@short-link/ui`** - 共享组件库：

- shadcn 风格组件（Button 等）
- `cn()` 工具函数（clsx + tailwind-merge）
- 所有组件支持 `asChild` 组合模式

### 🔌 API 响应封套

后端 `TransformInterceptor` 统一成功响应格式：

```typescript
{
  code: 0,          // 0 = 成功，非 0 = 业务错误
  data: T,          // 业务数据
  message: 'ok'     // 人类可读消息
}
```

前端 `createHttp` 自动解封套，直接返回 `data`：

```typescript
// 直接拿到 UserDTO[]，无需每次 .data
const users = await http.get<UserDTO[]>('/users');
```

### 🗄️ Prisma 7 配置

Prisma 7 不再在 `schema.prisma` 中通过 `env()` 读取 URL，而是通过 `prisma.config.ts` 动态注入，支持更灵活的多环境切换。

`PrismaModule` 标记为 `@Global()`，所有业务模块可直接注入 `PrismaService`，无需重复 import。

### 🔄 API 版本控制

通过 URI 版本控制，所有路由默认同时支持 `/api/v1` 和 `/api/v2`。需要破坏性变更时：

```typescript
@Controller('users')
@Version('2') // 仅在 v2 下可用
export class UsersV2Controller {}
```

### 🛡️ 安全与规范

- **ValidationPipe**：全局启用 `whitelist` + `forbidNonWhitelisted`，自动过滤未声明字段
- **CORS**：支持配置多域名白名单，生产环境建议关闭 `true`（允许所有）
- **oxlint**：极速 lint，前端自动启用 React hooks 规则检查

## 开发最佳实践

### 新增业务模块

```bash
# 1. 在 apps/server/src/ 下创建模块目录
mkdir apps/server/src/posts

# 2. 创建 posts.module.ts, posts.controller.ts, posts.service.ts

# 3. 在 app.module.ts 中导入模块
```

### 新增共享组件

```bash
# 1. 在 packages/ui/src/components/ui/ 下添加组件

# 2. 在 packages/ui/src/index.ts 中导出

# 3. 重启 dev 服务（或等待 tsup watch 自动构建）
```

### 数据库迁移

```bash
cd apps/server

# 修改 schema.prisma 后创建迁移
pnpm migrate:create --name add_posts_table

# 开发环境自动执行迁移，生产环境需手动执行
pnpm prisma migrate deploy
```

## 常见问题

### Q: 启动 dev 后前端提示依赖未找到？

A: 确保所有 packages 都已构建。首次运行建议先执行一次 `pnpm build`。

### Q: Prisma 类型报错？

A: 执行 `pnpm install` 或 `cd apps/server && pnpm prisma generate` 重新生成客户端。

### Q: 如何在其他项目中复用这些包？

A: 当前设置为 `private: true`，如需发布到 npm，移除 private 字段并配置 publishConfig。

## 路线图

- [ ] 全局异常过滤器（统一错误响应格式）
- [ ] 请求日志中间件
- [ ] 健康检查端点
- [ ] JWT 认证守卫
- [ ] Rate Limiting 限流
- [ ] Docker 支持
- [ ] E2E 测试配置

## 许可证

[MIT](./LICENSE)
