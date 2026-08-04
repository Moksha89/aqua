import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { FinancialAccessGuard } from '../auth/roles.guard';
import { AllocationService } from './allocation.service';
class RunDto { @ApiProperty() @IsString() periodStart!: string; @ApiProperty() @IsString() periodEnd!: string; @ApiProperty({ required: false }) @IsOptional() @IsIn(['MONTH_END','CLOSURE']) trigger?: 'MONTH_END'|'CLOSURE'; }
class IdleDto { @ApiProperty() @IsString() pondId!: string; @ApiProperty() @IsString() fromDate!: string; @ApiProperty() @IsString() toDate!: string; }
@UseGuards(JwtGuard, FinancialAccessGuard)
@Controller('allocations')
export class AllocationController {
  constructor(private readonly allocations: AllocationService) {}
  private ctx(r: AuthenticatedRequest) { return { businessId: r.user!.businessId!, userId: r.user!.id, deviceId: r.user!.deviceId }; }
  @Post('runs') run(@Body() b: RunDto, @Req() r: AuthenticatedRequest) { return this.allocations.run(b, this.ctx(r)); }
  @Post('idle-pond-costs') idle(@Body() b: IdleDto, @Req() r: AuthenticatedRequest) { return this.allocations.idle(b, this.ctx(r)); }
}
