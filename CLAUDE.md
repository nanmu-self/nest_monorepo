# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

pnpm workspace monorepo for a short-link service. Runtime targets Node ≥ 22.12 and pnpm ≥ 11. Root package is `short-link`; workspaces live under `apps/*` and `packages/*`.

- `apps/server` - NestJS 11 backend (`@short-link/server`), SWC-compiled, Prisma 7 + PostgreSQL.
- `apps/web-admin` - React 19 admin UI (`@short-link/web-admin`) built with Vite 8 and the React Compiler Babel plugin.
- `packages/shared` - `@short-link/shared`, published via tsup + tsc into `dist/` and consumed as `workspace:*`. Uses **subpath exports** to keep framework-specific code isolated: root (`@short-link/shared`) exports only the framework-agnostic `HttpError`; `@short-link/shared/http` exports the alova-based `createHttp` client. Server-side code that only needs shared types will not pull alova into its module graph.

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

The root `tsconfig.json` has empty `files` and only lists references to `packages/shared`, `apps/server`, `apps/web-admin`. Every leaf project extends `tsconfig.base.json`, sets `composite: true`, and writes its build-info file under `node_modules/.tmp/`. When adding a workspace, add it to `tsconfig.json` references AND to `pnpm-workspace.yaml`, otherwise `pnpm typecheck` will not see it.

Path alias `@/*` -> `./src/*` is configured per-project (`apps/server/tsconfig.json`, `apps/server/.swcrc`, `apps/web-admin/tsconfig.app.json`, `apps/web-admin/vite.config.ts`). Match this in new subprojects if you want the alias to resolve at build AND runtime.

### Server (`apps/server`)

- Entry is `src/main.ts`, which loads `dotenv/config` before doing anything else and delegates to `setupApp()` in `src/bootstrap.ts`. `setupApp` sets global prefix `api`, URI versioning with `defaultVersion: ['1', '2']` (so any route without `@Version()` is served under both `/api/v1` and `/api/v2`), CORS from `CORS_ORIGIN` (comma-split), and a `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`. Reuse `setupApp` if you add a second entry (e.g. tests).
- Nest CLI uses the SWC builder (`nest-cli.json` -> `.swcrc`) with `legacyDecorator` + `decoratorMetadata` for Nest DI. If you add server-side decorators or reflection, keep those flags aligned in both `.swcrc` and `apps/server/tsconfig.json`.
- Prisma is wrapped in `PrismaModule` (`src/prisma/prisma.module.ts`), marked `@Global()`. It provides `DATABASE_URL` via a `useFactory` that throws if the env var is missing, then instantiates `PrismaService` with a `@prisma/adapter-pg` `PrismaPg` adapter. Consumers inject `PrismaService` directly; do not re-import `PrismaModule` into feature modules.
- Prisma 7 does not read `env()` inside `schema.prisma`; the URL is injected via `apps/server/prisma.config.ts` (`datasource.url: process.env.DATABASE_URL`). Update that file if you need per-env connection logic.
- Generated Prisma types live at `src/generated/prisma/` and are consumed via the `@/generated/prisma/client` path. Directory is gitignored - always run `pnpm install` (or `prisma generate` inside `apps/server`) after pulling schema changes.
- Feature modules follow the `users/` shape: `*.module.ts`, `*.controller.ts`, `*.service.ts`, wired into `AppModule.imports`. Services select explicit columns to avoid leaking sensitive fields (see `UsersService.findAll` excluding `password_hash`) - preserve that habit when adding new tables.

### Web Admin (`apps/web-admin`)

- Vite dev server proxies `/api` to `VITE_SERVER_URL` (default `http://localhost:3000`); frontend code should always call `/api/...`, never a hardcoded host.
- React 19 with the React Compiler enabled via `@rolldown/plugin-babel` + `babel-plugin-react-compiler` (see `vite.config.ts`). tsconfig sets `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters` - expect the compiler to reject non-erasable TS syntax (enum bodies, namespaces, param-properties in non-decorator classes) and unused bindings.
- HTTP client is `src/lib/http.ts`, an Alova instance built from `createHttp` in the shared package. Default `baseURL` is `/api/v1`, overridable with `VITE_API_BASE_URL`.

### Shared package (`packages/shared`)

- **Build:** `tsup` emits ESM into `dist/` (one entry per subpath), then `tsc -p tsconfig.build.json` emits the `.d.ts` files. tsup's built-in dts pipeline has trouble with multi-entry `composite: true` projects, so we split the responsibilities. `pnpm dev` runs `tsup --watch`, which is why the root `dev` script starts shared alongside server + web-admin - server/web-admin depend on `dist/` at runtime.
- **Subpath exports:** `.` -> `dist/index.js` (framework-agnostic, currently just `HttpError`); `./http` -> `dist/http/index.js` (alova client). Add new subpaths by extending both `tsup.config.ts` `entry` and the `exports` map in `package.json`.
- **`createHttp(options)`** builds an Alova instance. It injects `Authorization: Bearer <token>` from `getToken()`, calls `onUnauthorized()` on 401, and normalises non-2xx responses and network failures into `HttpError { status, message, data }` before rethrowing. It also parses NestJS's `{ statusCode, message, error }` shape via `extractErrorMessage`. The `statesHook` must be injected by the caller (`ReactHook` in `apps/web-admin`), so shared stays framework-neutral.
- Consumers must declare `alova` (and their own states-hook adapter) as direct dependencies - shared no longer re-exports them at runtime.

## Code style

- oxlint config (`.oxlintrc.json`) enforces the `correctness` category as errors, plus `eqeqeq`, `no-var`, `prefer-const`, `no-unused-private-class-members`; `no-console` is a warning. `apps/web-admin/**` additionally enables the `react` plugin with `rules-of-hooks` and `only-export-components`.
- Prettier is the source of truth for formatting; run `pnpm format` before committing.
- Comments and docstrings in the existing code are written in Chinese - match that when editing nearby code.
