import { Controller, Get, UseGuards } from '@nestjs/common';
import type { UserDTO } from '@short-link/shared';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserDTO[]> {
    return this.usersService.findAll();
  }
}
