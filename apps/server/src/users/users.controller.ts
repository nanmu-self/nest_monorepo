import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import type { UserDTO, UserListDTO } from '@app/shared';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

/**
 * 用户查询参数。
 *
 * 必须使用 class（不能是 interface），否则 ValidationPipe 的反射校验会静默失效。
 *
 * 注意：ValidationPipe 未开启 enableImplicitConversion，query 参数默认是 string，
 * number 字段必须显式 @Type(() => Number) 转换，否则 service 里的
 * `typeof page === 'number'` 判断永远为 false，会退化到全量查询分支。
 */
export class QueryUsersDto {
  /** 页码（从 1 开始） */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  /** 每页条数 */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
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
  @ApiOperation({
    summary: '查询用户（支持分页与邮箱搜索）',
    description: '传 page/pageSize 时返回 { list, total }；不传时返回全量数组（旧行为）。',
  })
  @ApiOkResponse({ description: '用户列表（不含密码哈希），分页时附带 total' })
  async findAll(@Query() query: QueryUsersDto): Promise<UserDTO[] | UserListDTO> {
    return this.usersService.findAll({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search?.trim() || undefined,
    });
  }
}
