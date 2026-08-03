import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { FinancialAccessGuard } from './roles.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, FinancialAccessGuard],
  exports: [AuthService, JwtGuard, FinancialAccessGuard],
})
export class AuthModule {}
