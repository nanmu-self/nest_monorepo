import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * 健康检查接口（公开，无需认证）。
 *
 * 供 Docker / K8s / 负载均衡探针使用，路由挂载在 /api/v1/health 与 /api/v2/health。
 * 数据库不可达时由 terminus 抛出 503，经 AllExceptionFilter 统一封套，
 * 探针只需要看 HTTP 状态码即可判定存活。
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '健康检查（含数据库连通性）' })
  @ApiOkResponse({ description: '服务与数据库均可用' })
  check() {
    return this.health.check([
      // ping 走 SELECT 1，超时 1s：探针要的是快速失败，不是完整查询能力
      () => this.prismaHealth.pingCheck('database', this.prisma, { timeout: 1000 }),
    ]);
  }
}
