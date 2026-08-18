# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

pnpm workspace monorepo template for full-stack admin services (general-purpose starter, cut from a short-link project). Runtime targets Node ≥ 22.12 and pnpm ≥ 11. Root package is `app`; workspaces live under `apps/*` and `packages/*`.

- `apps/server` - NestJS 11 backend (`@app/server`), SWC-compiled, Prisma 7 + PostgreSQL.
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

- `pnpm migrate:create [--name <slug>]` - `prisma migrate dev`.
- `pnpm db:pull` - reverse-sync `schema.prisma` from a live DB.
- `pnpm db:comment:pull` - pull column comments via `prisma-commenter`.
- `postinstall` runs `prisma generate`, so a fresh `pnpm install` populates `apps/server/src/generated/prisma/` (gitignored).

There is no test runner configured; do not fabricate a `pnpm test` command.

## Architecture

### TypeScript Project References

The root `tsconfig.json` has empty `files` and only lists references to `packages/shared`, `packages/config-tailwind`, `packages/ui`, `apps/server`, `apps/web-admin`. Every leaf project extends `tsconfig.base.json`, sets `composite: true`, and writes its build-info file under `node_modules/.tmp/`. When adding a workspace, add it to `tsconfig.json` references AND to `pnpm-workspace.yaml`, otherwise `pnpm typecheck` will not see it.

Path alias `@/*` -> `./src/*` is configured per-project (`apps/server/tsconfig.json`, `apps/server/.swcrc`, `apps/web-admin/tsconfig.app.json`, `apps/web-admin/vite.config.ts`). Match this in new subprojects if you want the alias to resolve at build AND runtime.

### Server (`apps/server`)

- Entry is `src/main.ts`, which delegates to `setupApp()` in `src/bootstrap.ts`. **dotenv is NOT loaded here** — `@/config/env` loads it on its own (top of the module), so anywhere that imports `@/config/env` triggers the load regardless of import order. `setupApp` sets global prefix `api`, URI versioning with `defaultVersion: ['1', '2']` (so any route without `@Version()` is served under both `/api/v1` and `/api/v2`), CORS from `CORS_ORIGIN` (comma-split), and a `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`. Reuse `setupApp` if you add a second entry (e.g. tests).
- Nest CLI uses the SWC builder (`nest-cli.json` -> `.swcrc`) with `legacyDecorator` + `decoratorMetadata` for Nest DI. If you add server-side decorators or reflection, keep those flags aligned in both `.swcrc` and `apps/server/tsconfig.json`.
- Prisma is wrapped in `PrismaModule` (`src/prisma/prisma.module.ts`), marked `@Global()`. It does **not** provide `DATABASE_URL` — that env var is validated at startup by `@/config/env` (which throws if missing) and `PrismaService` imports the already-validated `DATABASE_URL` constant. Consumers inject `PrismaService` directly; do not re-import `PrismaModule` into feature modules.
- Prisma 7 does not read `env()` inside `schema.prisma`; the URL is injected via `apps/server/prisma.config.ts` (`datasource.url: process.env.DATABASE_URL`). Update that file if you need per-env connection logic.
- Generated Prisma types live at `src/generated/prisma/` and are consumed via the `@/generated/prisma/client` path. Directory is gitignored - always run `pnpm install` (or `prisma generate` inside `apps/server`) after pulling schema changes.
- Feature modules follow the `users/` shape: `*.module.ts`, `*.controller.ts`, `*.service.ts`, wired into `AppModule.imports`. Services select explicit columns to avoid leaking sensitive fields (see `UsersService.findAll` excluding `password_hash`) - preserve that habit when adding new tables.

### Web Admin (`apps/web-admin`)

- Vite dev server proxies `/api` to `VITE_SERVER_URL` (default `http://localhost:3000`); frontend code should always call `/api/...`, never a hardcoded host.
- React 19 with the React Compiler enabled via `@rolldown/plugin-babel` + `babel-plugin-react-compiler` (see `vite.config.ts`). tsconfig sets `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters` - expect the compiler to reject non-erasable TS syntax (enum bodies, namespaces, param-properties in non-decorator classes) and unused bindings.
- HTTP client is `src/lib/http.ts`, an Alova instance built from `createHttp` in the shared package. Default `baseURL` is `/api/v1`, overridable with `VITE_API_BASE_URL`.
- **全局 button 样式陷阱：** `src/index.css` 的 `@layer base` 给所有原生 `<button>` 设了黑底白字 + `padding: 10px 22px` + `border-radius: 980px`（Apple 风格主按钮）。图标按钮（只有图标、无文字的小按钮）不能直接用裸 `<button>` 加 Tailwind utilities 覆盖——`button:hover` 的 `background` 声明会干扰 `hover:bg-*`，`padding` 会撑变形。正确做法：给图标按钮加 `.icon-btn` 类（定义在 `@layer components`，已覆盖 padding/background/color/hover），危险操作用 `.icon-btn-danger`。参考 `AppLayout` 的 `.btn-sidebar-toggle` / `.btn-logout` 也是同样的 components 层覆盖模式。

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
