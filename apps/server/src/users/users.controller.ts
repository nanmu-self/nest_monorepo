import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { UserDTO } from '@app/shared';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

/**
 * 用户查询参数。
 *
 * 必须使用 class（不能是 interface），否则 ValidationPipe 的反射校验会静默失效。
 */
export class QueryUsersDto {
  /** 页码（从 1 开始） */
  @IsOptional()
  page?: number;

  /** 每页条数 */
  @IsOptional()
  pageSize?: number;

  /** 按邮箱模糊搜索 */
  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '查询用户（支持分页与邮箱搜索）' })
  @ApiOkResponse({ description: '用户列表（不含密码哈希）' })
  async findAll(
    @Query() query: QueryUsersDto,
  ): Promise<UserDTO[]> {
    return this.usersService.findAll({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search?.trim() || undefined,
    });
  }
}
