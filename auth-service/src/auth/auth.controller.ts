import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { CheckInput } from './policy.service';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/login')
  login(@Body() body: { username: string; password: string }) {
    try {
      return this.auth.login(body.username, body.password);
    } catch (e) {
      return { statusCode: 401, message: e.message };
    }
  }

  @Get('policies')
  policies() {
    return this.auth.getPolicies();
  }

  @Post('policies')
  addPolicy(@Body() body: { action: string; description: string; role: string }) {
    return this.auth.addPolicy(body.action, body.description, body.role);
  }

  @GrpcMethod('PDPService', 'CheckAccess')
  checkAccess(ctx: CheckInput) {
    return this.auth.can(ctx);
  }
}