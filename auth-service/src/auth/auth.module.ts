import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PolicyService } from './policy.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PolicyService],
})
export class AuthModule {}