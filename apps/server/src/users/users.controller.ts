import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserDTO } from '@app/shared';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '查询全部用户' })
  @ApiOkResponse({ description: '用户列表（不含密码哈希）' })
  async findAll(): Promise<UserDTO[]> {
    return this.usersService.findAll();
  }
}
