import { Module, RequestMethod } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { IS_PRODUCTION, LOG_LEVEL } from '@/config/env';

/**
 * dev 环境的 pino-pretty transport 配置。
 *
 * transport 是在 worker 线程里按「模块名」加载的，pnpm 的隔离 node_modules
 * 下按名字解析可能找不到包。用 require.resolve 把模块名换成绝对路径，
 * 从当前包出发解析，永远命中 apps/server 自己的依赖。
 *
 * 解析失败（如生产镜像只装了 dependencies）则返回 undefined，
 * pino 退回默认的 JSON 行输出--这正是生产想要的形态。
 */
function devPrettyTransport() {
  if (IS_PRODUCTION) return undefined;
  try {
    return {
      target: require.resolve('pino-pretty'),
      options: {
        // 单行输出：与 AllExceptionFilter「一个事件一条日志」的约定一致
        singleLine: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname,req.remoteAddress,req.remotePort',
      },
    };
  } catch {
    return undefined;
  }
}

/**
 * 结构化日志模块（nestjs-pino / pino-http）。
 *
 * - 每个 HTTP 请求自动记一行：method、路径、状态码、耗时（responseTime ms），
 *   携带自增 reqId 便于一次请求的多条日志做关联。
 * - 生产输出 JSON 行（日志采集器直接消费），开发用 pino-pretty 美化。
 * - 敏感头脱敏：Authorization / Cookie 进日志前替换为 [REDACTED]。
 * - 健康检查路径不记访问日志：容器探针每隔几秒打一次，全是噪音。
 * - 通过 bootstrap.ts 的 app.useLogger(app.get(Logger)) 接管 Nest 全局
 *   logger，Nest 自身的模块加载日志与 AllExceptionFilter 的错误日志
 *   （@nestjs/common 的 Logger）都会路由到同一个 pino 实例。
 * - reqId 关联的生效机制（不是魔法）：nestjs-pino 注册的第二个中间件
 *   bindLoggerMiddleware 用 AsyncLocalStorage（storage.run）把「当前请求
 *   的 child logger」注入整个下游链--守卫、拦截器、控制器、异常过滤器
 *   都在链内。因此 AllExceptionFilter 里的 Nest Logger 调用经
 *   PinoLogger.logger getter（storage.getStore()?.logger ?? 根实例）
 *   自动命中带 reqId 的 child logger。边界：请求链之外的日志
 *   （bootstrap、生命周期钩子、定时任务）落到根 logger，没有 reqId。
 */
@Module({
  imports: [
    LoggerModule.forRoot({
      // nestjs-pino 默认用旧版通配符 forRoutes('*') 注册中间件，在
      // Nest 11（path-to-regexp v8）下会触发 LegacyRouteConverter 的
      // "Unsupported route path: /api/*" 启动告警；显式改用新语法 {*splat}
      // 覆盖全局前缀下的所有路由，消除告警。
      forRoutes: [{ path: '{*splat}', method: RequestMethod.ALL }],
      pinoHttp: {
        level: LOG_LEVEL,
        transport: devPrettyTransport(),
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          censor: '[REDACTED]',
        },
        autoLogging: {
          // 探针流量不记访问日志（业务异常仍会经 AllExceptionFilter 记录）
          ignore: (req) => /\/health$/.test(req.url ?? ''),
        },
        // 默认 msg 是 "request completed"，信息量太低；换成一行可读摘要。
        // 去掉 query string：URL 参数可能带敏感值，不该进日志。
        customSuccessMessage: (req, res) =>
          `${req.method} ${req.url?.split('?')[0]} -> ${res.statusCode}`,
        customErrorMessage: (req, res, error) =>
          `${req.method} ${req.url?.split('?')[0]} -> ${res.statusCode} (${error.message})`,
      },
    }),
  ],
})
export class AppLoggerModule {}
