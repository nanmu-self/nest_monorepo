import { Controller, Get } from '@nestjs/common';
import type { UserDTO } from '@short-link/shared';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserDTO[]> {
    return this.usersService.findAll();
  }
}
