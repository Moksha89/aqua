import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService, JwtGuard],
})
export class AuthModule {}
