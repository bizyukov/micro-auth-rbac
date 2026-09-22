import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { BffService } from './bff.service';

@Controller()
export class BffController {
  constructor(private readonly bff: BffService) {}

  @Post('auth/login')
  login(@Body() body: { username: string; password: string }) {
    return this.bff.login(body.username, body.password);
  }

  @Get('users')
  users(@Headers('authorization') auth?: string) {
    return this.bff.getUsers(auth);
  }

  @Get('documents/:id')
  document(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return this.bff.getDocument(Number(id), auth);
  }

  @Post('auth/policies')
  addPolicy(@Body() body: { action: string; description: string; role: string }) {
    return this.bff.addPolicy(body.action, body.description, body.role);
  }
}