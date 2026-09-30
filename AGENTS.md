# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

pnpm workspace monorepo template for full-stack admin services (general-purpose starter, cut from a short-link project). Runtime targets Node ≥ 24 (Prisma 8 hard requirement) and pnpm ≥ 11. Root package is `app`; workspaces live under `apps/*` and `packages/*`.

- `apps/server` - NestJS 11 backend (`@app/server`), SWC-compiled, Prisma 8 (contract workflow) + PostgreSQL.
- `apps/web-admin` - React 19 admin UI (`@app/web-admin`) built with Vite 8 and the React Compiler Babel plugin.
- `packages/shared` - `@app/shared`, published via tsup + tsc into `dist/` and consumed as `workspace:*`. Uses **subpath exports** to keep framework-specific code isolated: root (`@app/shared`) exports framework-agnostic types/classes (`HttpError`, `ErrorCode` enum, API DTO types — `UserDTO`, `LoginRequest`, `LoginResponse`, `ApiResponse`, `UploadTokenResponse`); `@app/shared/http` exports the alova-based `createHttp` client. Server-side code that only needs shared types will not pull alova into its module graph.
- `packages/config-tailwind` - `@app/config-tailwind`, Tailwind 4 design tokens (`@theme` + `@layer components`) bundled via tsup. Consumed as `@import '@app/config-tailwind/styles.css'` from the consumer's CSS entry; has no JS API beyond the empty `index.ts` placeholder.
- `packages/ui` - `@app/ui`, shadcn-style components (Button, Input, Card, Field, Label, cn()) bundled via tsup. `lucide-react` and `react` are peer dependencies — consumers must install them themselves.

## Common commands

Run from the repo root unless noted:

- `pnpm dev` - starts server (`nest start --watch`) and web-admin (`vite`) in parallel.
- `pnpm build` - `pnpm -r build` across all workspaces.
- `pnpm typecheck` - `tsc --build` walks the root Project References graph incrementally.
- `pnpm lint` / `pnpm lint:fix` - oxlint over the whole repo.
- `pnpm format` / `pnpm format:check` - Prettier.
- `pnpm clean` - removes every `dist` and `.tsbuildinfo`.

Inside `apps/server`:

- `pnpm migrate:create` - `prisma migration plan`：把契约变更生成可审查的 TS 迁移（graph-based）。
- `pnpm migrate:apply` - `prisma db migrate`：按迁移图推进数据库。
- `pnpm db:emit` / `db:infer` / `db:sign` - 契约编译 / 从线上库反推契约 / 给数据库写签名。
- `postinstall` runs `prisma contract emit`，重新产出 `prisma/contract.json` + `contract.d.ts`（两个都要提交进 git）。

**Note:** There is no test runner configured; do not fabricate a `pnpm test` command.

## Architecture

### TypeScript Project References

The root `tsconfig.json` has empty `files` and only lists references to `packages/shared`, `packages/config-tailwind`, `packages/ui`, `apps/server`, `apps/web-admin`. Every leaf project extends `tsconfig.base.json`, sets `composite: true`, and writes its build-info file under `node_modules/.tmp/`. When adding a workspace, add it to `tsconfig.json` references AND to `pnpm-workspace.yaml`, otherwise `pnpm typecheck` will not see it.

Path alias `@/*` -> `./src/*` is configured per-project (`apps/server/tsconfig.json`, `apps/server/.swcrc`, `apps/web-admin/tsconfig.app.json`, `apps/web-admin/vite.config.ts`). Match this in new subprojects if you want the alias to resolve at build AND runtime.

### Server (`apps/server`)

- Entry is `src/main.ts`, which delegates to `setupApp()` in `src/bootstrap.ts`. **dotenv is NOT loaded here** — `@/config/env` loads it on its own (top of the module), so anywhere that imports `@/config/env` triggers the load regardless of import order. `setupApp` sets global prefix `api`, URI versioning with `defaultVersion: ['1', '2']` (so any route without `@Version()` is served under both `/api/v1` and `/api/v2`), CORS from `CORS_ORIGIN` (comma-split), and a `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`. Reuse `setupApp` if you add a second entry (e.g. tests).
- Nest CLI uses the SWC builder (`nest-cli.json` -> `.swcrc`) with `legacyDecorator` + `decoratorMetadata` for Nest DI. If you add server-side decorators or reflection, keep those flags aligned in both `.swcrc` and `apps/server/tsconfig.json`.
- Prisma is wrapped in `PrismaModule` (`src/prisma/prisma.module.ts`), marked `@Global()`. It does **not** provide `DATABASE_URL` — that env var is validated at startup by `@/config/env` (which throws if missing) and `PrismaService` imports the already-validated `DATABASE_URL` constant. Consumers inject `PrismaService` directly; do not re-import `PrismaModule` into feature modules.
- **Prisma 8（contract 工作流）**：数据模型写在 `prisma/contract.prisma`（PSL，顶部必须 `// use prisma-next`）。没有 PrismaClient 类：`PrismaService` 用 `@prisma/orm-postgres/runtime` 的 `postgres()` 工厂创建客户端，`onModuleInit` 里 `connect()`。`PrismaService.orm` getter 返回 `client.orm.public`（即 Namespace），业务代码通过 `this.prisma.orm.User` 访问模型 Collection。查询写法：
  - `this.prisma.orm.User.where((u) => u.email.eq('test@example.com')).first()`
  - `this.prisma.orm.User.select('id', 'email').where((u) => u.email.like(`%search%`)).limit(10).offset(20).all()`
  - 终端方法：`.all()`（返回 AsyncIterableResult，可 await 得数组）、`.first()`（返回 Promise<Row | null>）等
  - 聚合限制：`count()` / `sum()` 等标量聚合**只能在 `include()` 回调内**对 to-many 关系归约使用，顶层集合没有 count 终端；分组聚合走 `.groupBy(...).aggregate(...)`。需要全表/过滤计数时，取符合条件的主键列表（`.select('id').all()`）后计长
  - 链式方法：`.where(...)`、`.select(...)`、`.orderBy(...)`、`.limit(...)`、`.offset(...)`、`.cursor(...)`、`.include(...)`
  - 操作符：`.eq()`, `.neq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`, `.like()`, `.ilike()`, `.in([...])`, `.isNull()`, `.isNotNull()`
  - 改契约后先 `pnpm db:emit` 再做迁移。
- PSL 8 语法注意：原生类型写在类型位置（`VarChar(128)`、`Timestamptz(6)`，不是 `@db.VarChar`）；没有 `@updatedAt`；`VarChar(N)` 在 TS 侧是 branded string，写入处需 `as Varchar<N>` 断言；timestamptz 读出是 `Temporal.Instant`（不是 Date）。连接串与扩展在 `prisma.config.ts`（`definePrismaConfig` + `@prisma/orm-postgres/config`），该文件被排除在 tsconfig 之外（CLI 经 jiti 评估）。
- `prisma/contract.json` + `contract.d.ts` 是确定性产物，提交进版本控制；`prisma db update`（开发直改）会同步写数据库签名。`@nestjs/terminus` 的 `PrismaHealthIndicator` 依赖 v7 客户端已弃用，健康检查走 `HealthController` 里的自定义指标（`PrismaService.ping()`）。
- Feature modules follow the `users/` shape: `*.module.ts`, `*.controller.ts`, `*.service.ts`, wired into `AppModule.imports`. Services select explicit columns to avoid leaking sensitive fields (see `UsersService.findAll` excluding `password_hash`) - preserve that habit when adding new tables.
- `UsersService` 已支持分页（`page`/`pageSize`）与邮箱模糊搜索（`search`），前端 `UsersPage` 对应实现了搜索框、每页条数选择器和分页控件。新增列表接口时参考该形状。
- **DTO 必须是 class**：全局 `ValidationPipe` 依赖 `emitDecoratorMetadata` 反射出的设计期类型做校验，interface 在编译期被擦除，会导致校验静默失效。SWC 构建器不支持 `@nestjs/swagger` 的 CLI 插件，所以 `@ApiProperty` / `@ApiPropertyOptional` 需要显式标注。
- **Query DTO 的 number 字段必须 `@Type(() => Number)`**：ValidationPipe 未开启 `enableImplicitConversion`，query 参数默认是 string，仅声明 `page?: number` 不会转换——`typeof page === 'number'` 判断会静默失败、走错分支（参考 `QueryUsersDto`，需配 `@IsNumber()`）。

#### Error handling & logging

- **统一错误封套**：`AllExceptionFilter` 把所有异常包装成 `{ code, message, data? }`。`BizException` 携带业务码（>= 10000），普通 HTTP 异常的 code 等于 HTTP 状态码。生产环境 500 错误会脱敏。
- **结构化日志**：`nestjs-pino` + `pino-http`，每个 HTTP 请求自动记一行（method、路径、状态码、耗时），携带自增 `reqId` 便于关联。敏感头（Authorization、Cookie）自动脱敏。健康检查路径不记访问日志。
- **业务异常**：继承 `HttpException`，在响应体里同时携带业务码和 HTTP 状态码。详见 `src/common/biz-exception.ts`。
- **Prisma 错误**：`AllExceptionFilter` 识别 Prisma 已知错误码（`P2002` 唯一约束冲突、`P2025` 记录未找到），映射为合适的 HTTP 状态码。

#### Rate limiting

- `@nestjs/throttler` 已安装，**当前仅在 `AuthModule` 配置**（登录接口限流：60 秒内最多 100 次）。其他接口暂无全局限流。若需全局限流，在 `AppModule` 导入 `ThrottlerModule` 并配置。

### Web Admin (`apps/web-admin`)

- Vite dev server proxies `/api` to `VITE_SERVER_URL` (default `http://localhost:3000`); frontend code should always call `/api/...`, never a hardcoded host.
- React 19 with the React Compiler enabled via `@rolldown/plugin-babel` + `babel-plugin-react-compiler` (see `vite.config.ts`). tsconfig sets `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters` - expect the compiler to reject non-erasable TS syntax (enum bodies, namespaces, param-properties in non-decorator classes) and unused bindings.
- HTTP client is `src/lib/http.ts`, an Alova instance built from `createHttp` in the shared package. Default `baseURL` is `/api/v1`, overridable with `VITE_API_BASE_URL`.
- **全局 button 样式陷阱：** `src/index.css` 的 `@layer base` 给所有原生 `<button>` 设了黑底白字 + `padding: 10px 22px` + `border-radius: 980px`（Apple 风格主按钮）。图标按钮（只有图标、无文字的小按钮）不能直接用裸 `<button>` 加 Tailwind utilities 覆盖——`button:hover` 的 `background` 声明会干扰 `hover:bg-*`，`padding` 会撑变形。正确做法：给图标按钮加 `.icon-btn` 类（定义在 `@layer components`，已覆盖 padding/background/color/hover），危险操作用 `.icon-btn-danger`。参考 `AppLayout` 的 `.btn-sidebar-toggle` / `.btn-logout` 也是同样的 components 层覆盖模式。
- **按钮统一走 `@app/ui` 的 `Button`**：常规文字按钮用 `<Button variant="default" | "secondary">`（胶囊形 `rounded-full`，与 base 层 980px 圆角设计语言一致）；链接按钮用 `<Button asChild><Link to="..."/></Button>`。web-admin 里旧的 `.btn-primary` / `.btn-ghost` 快捷类已删除——不要再新建同类快捷类，避免与共享包 Button 形成双真理源。
- **数据请求约定：** 参数/状态驱动的列表请求用 `useWatcher`（alova 默认 `abortLast`，只有最后一次请求的响应会写入状态，天然防竞态；支持 `debounce` 按监听项配置），一次性请求才用 `useRequest` + `send()`。

### Shared package (`packages/shared`)

- **Build:** `tsup` emits ESM into `dist/` (one entry per subpath), then `tsc -p tsconfig.build.json` emits the `.d.ts` files. tsup's built-in dts pipeline has trouble with multi-entry `composite: true` projects, so we split the responsibilities. `pnpm dev` runs `tsup --watch`, which is why the root `dev` script starts shared alongside server + web-admin - server/web-admin depend on `dist/` at runtime.
- **Subpath exports:** `.` -> `dist/index.js` (framework-agnostic — `HttpError` class, `ErrorCode` enum, API DTO types); `./http` -> `dist/http/index.js` (alova client, also re-exports `HttpError` for convenience). Add new subpaths by extending both `tsup.config.ts` `entry` and the `exports` map in `package.json`.
- **Adding new business types:** Business DTOs (response/request shapes that the API exchanges) go under `src/contracts/<domain>.ts` (e.g. `src/contracts/user.ts`) and are re-exported from `src/contracts/index.ts` so the root `./` subpath picks them up. `ErrorCode` entries go in `src/constants/error-codes.ts` and follow the existing numeric ranges (10000–10099 generic, 10100–10199 auth, 20000+ per-domain — see the segment table at the top of that file).
- **`createHttp(options)`** builds an Alova instance. It injects `Authorization: Bearer <token>` from `getToken()`, calls `onUnauthorized()` on 401, and normalises non-2xx responses and network failures into `HttpError { status, message, data }` before rethrowing. The server's `AllExceptionFilter` wraps errors into the same `{ code, message, data? }` envelope used by successful responses, and `extractErrorMessage` reads `message` from that body. The `statesHook` must be injected by the caller (`ReactHook` in `apps/web-admin`), so shared stays framework-neutral.
- Consumers must declare `alova` (and their own states-hook adapter) as direct dependencies - shared no longer re-exports them at runtime.

### UI / styles packages (`packages/config-tailwind`, `packages/ui`)

Both packages are CSS-first — `tsup` bundles the JS entry and `onSuccess` copies the CSS file into `dist/`. Consumers import the CSS via `@import '@app/<pkg>/styles.css';` from their own CSS entry (see `apps/web-admin/src/index.css` for the canonical order: tailwind → tw-animate-css → config-tailwind → ui → consumer overrides).

- **`@app/config-tailwind`** — the design-token source of truth: brand color ramp (`--color-brand-50` through `--color-brand-900`), functional colors (`--color-success / -warning / -danger`), font families. Defines utility class shortcuts (`.btn-primary`, `.btn-ghost`, `.card`, `.flex-center`, etc.) in `@layer components`. Components added in the consumer's `@layer components` later in the cascade **override** these (same specificity, later wins).
- **`@app/ui`** — shadcn-style semantic tokens (`--color-background / -foreground / -primary / -border / ...`) and a small component set (`Button`, `Input`, `Label`, `Card`, `Field` family). `Button` uses cva variants (`variant` + `size`); `Field` is the form-binding primitive (uses `data-invalid` for error styling). Adding a new component: place it under `src/components/ui/`, re-export from `src/index.ts`, and let Tailwind's `@source './**/*.{ts,tsx,js}';` in `styles.css` auto-pick up cva classes — no separate consumer registration needed.

## Code style

- oxlint config (`.oxlintrc.json`) enforces the `correctness` category as errors, plus `eqeqeq`, `no-var`, `prefer-const`, `no-unused-private-class-members`; `no-console` is a warning. `apps/web-admin/**` additionally enables the `react` plugin with `rules-of-hooks` and `only-export-components`.
- Prettier is the source of truth for formatting; run `pnpm format` before committing.
- Comments and docstrings in the existing code are written in Chinese - match that when editing nearby code.

## Adding a new feature module (server)

1. Create `src/<feature>/<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`
2. Wire the module into `AppModule.imports`
3. Add DTOs under `src/<feature>/dto/` — remember: **must be `class`**, not `interface`, for ValidationPipe to work. Add `@ApiProperty` / `@ApiPropertyOptional` for Swagger docs.
4. Add shared contract types in `packages/shared/src/contracts/<feature>.ts` and re-export from `src/contracts/index.ts`
5. Add business error codes in `packages/shared/src/constants/error-codes.ts` following the existing numeric ranges
6. Use `PrismaService` for data access; select explicit columns to avoid leaking sensitive fields
7. Throw `BizException` with business error codes for expected failures; let unexpected errors bubble to `AllExceptionFilter`

## Adding a new page (web-admin)

1. Create `src/pages/<page>/index.tsx` and add the route in `src/router/index.tsx`
2. Add API functions in `src/api/<feature>.ts` using the shared `http` client
3. Use `useWatcher` from alova for param/state-driven data fetching (see「数据请求约定」above); handle `loading`, `error`, and empty states
4. Use shared UI components from `@app/ui` and styles from `@app/config-tailwind`
5. For forms, use the `Field` family from `@app/ui` with `data-invalid` for error styling
6. For error messages, use `resolveErrorMessage` from `@/lib/error-message` to map business codes to user-friendly text

## Missing features & TODOs

The following are **not yet implemented** and should not be assumed to exist:

- **Dockerfiles**: Only `docker-compose.yml` exists (PostgreSQL only). No application Dockerfiles for server/web-admin.
- **Tests**: No test runner (vitest/jest) configured. Do not write `pnpm test` scripts.
- **OpenAPI codegen**: Frontend API clients (`apps/web-admin/src/api/*.ts`) are handwritten. No auto-generated clients from Swagger spec.
- **Global rate limiting**: `@nestjs/throttler` is installed but only applied to `AuthModule`. No global throttle guard.
- **Request ID middleware**: While pino logs include `reqId`, there is no explicit request-id middleware for correlation across services.
- **Health check endpoint**: `HealthModule` exists but only checks Prisma connectivity. No `/health/live` or `/health/ready` separation.
- **Database migration CI**: CI workflow does not run `prisma migrate deploy` against a test database.
- **Web-admin feature modules**: All pages are in `src/pages/` without feature-level module separation. No shared page components beyond the UI package.

## Environment variables

### Server (`apps/server/.env`)

| Variable                                                                  | Required    | Description                                         |
| ------------------------------------------------------------------------- | ----------- | --------------------------------------------------- |
| `NODE_ENV`                                                                | Yes         | `development` \| `production`                       |
| `PORT`                                                                    | Yes         | Server port (default 3000)                          |
| `DATABASE_URL`                                                            | Yes         | PostgreSQL connection string                        |
| `CORS_ORIGIN`                                                             | Yes         | Comma-separated allowed origins                     |
| `JWT_SECRET`                                                              | Yes         | JWT signing secret                                  |
| `SWAGGER_ENABLED`                                                         | No          | Enable Swagger UI (default false in production)     |
| `LOG_LEVEL`                                                               | No          | Pino log level (default `info`)                     |
| `QINIU_ACCESS_KEY` / `QINIU_SECRET_KEY` / `QINIU_BUCKET` / `QINIU_DOMAIN` | Conditional | Qiniu cloud storage (required for upload endpoints) |

### Web Admin (`apps/web-admin/.env`)

| Variable                      | Required | Description                                                 |
| ----------------------------- | -------- | ----------------------------------------------------------- |
| `VITE_SERVER_URL`             | No       | Backend URL for dev proxy (default `http://localhost:3000`) |
| `VITE_API_BASE_URL`           | No       | API base path override (default `/api/v1`)                  |
| `VITE_QINIU_UPLOAD_TOKEN_URL` | No       | Upload token endpoint (default `/api/qiniu/upload-token`)   |

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push to `main` and pull requests:

1. Setup pnpm (reads version from root `package.json` `packageManager` field)
2. Setup Node.js 22
3. Install dependencies with `--frozen-lockfile` (triggers `postinstall` → `prisma contract emit`)
4. Lint (`pnpm lint`)
5. Format check (`pnpm format:check`)
6. Typecheck (`pnpm typecheck`)
7. Build (`pnpm build`)

Concurrency groups cancel in-progress runs on the same branch.
