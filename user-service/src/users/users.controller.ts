import { Controller, Get } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  all() {
    return this.users.getAll();
  }

  @GrpcMethod('UserService', 'GetUsers')
  getUsers() {
    return { users: this.users.getAll() };
  }
}