import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { HarvestService } from './harvest.service';
import { UserRole } from '../auth/roles';
import { FinancialAccessGuard } from '../auth/roles.guard';
class HarvestLineDto { @ApiProperty({ required: false }) @IsOptional() @IsString() speciesId?: string; @ApiProperty() @IsIn(['COUNT','GRADE']) basis!: 'COUNT'|'GRADE'; @ApiProperty() @IsString() key!: string; @ApiProperty() @IsString() quantityKg!: string; @ApiProperty() @IsString() ratePerKgPaise!: string; }
class HarvestDto { @ApiProperty() @IsString() harvestDate!: string; @ApiProperty() @IsNumber() doc!: number; @ApiProperty() @IsIn(['PARTIAL','FINAL']) type!: 'PARTIAL'|'FINAL'; @ApiProperty() @IsIn(['TARGET_SIZE','MARKET_RATE','DISEASE','SEASON_END','OTHER']) reason!: 'TARGET_SIZE'|'MARKET_RATE'|'DISEASE'|'SEASON_END'|'OTHER'; @ApiProperty() @IsBoolean() sampleTaken!: boolean; @ApiProperty({ required: false }) @IsOptional() @IsNumber() sampleCount?: number; @ApiProperty({ required: false }) @IsOptional() @IsString() sampleWeightG?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() buyerPartyId?: string; @ApiProperty({ type: [HarvestLineDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => HarvestLineDto) lines!: HarvestLineDto[]; }
export class CropPnlDto {
  @ApiProperty() id!: string;
  @ApiProperty() businessId!: string;
  @ApiProperty() cropId!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) generatedAt!: Date | string;
  @ApiProperty() generatedBy!: string;
  @ApiProperty({ type: Object }) payload!: unknown;
  @ApiProperty() isCurrent!: boolean;
}
export class CloseCropResponseDto {
  @ApiProperty()
  cropId!: string;

  @ApiProperty({ enum: ['CLOSED'] })
  status!: 'CLOSED';

  @ApiProperty()
  pnlFrozen!: boolean;

  @ApiProperty({ nullable: true, type: CropPnlDto })
  pnl!: CropPnlDto | null;
}
@UseGuards(JwtGuard)
@Controller('crops')
export class HarvestController {
  constructor(private readonly harvests: HarvestService) {}
  private ctx(r: AuthenticatedRequest) { return { userId: r.user!.id, businessId: r.user!.businessId!, role: r.user!.role ?? UserRole.OPERATOR, financialAccess: r.user!.financialAccess, pondScope: r.user!.pondScope, deviceId: r.user!.deviceId }; }
  @Post(':id/harvests') harvest(@Param('id') id: string, @Body() b: HarvestDto, @Req() r: AuthenticatedRequest) { return this.harvests.harvest(id, b, this.ctx(r)); }
  @Get(':id/harvests') @UseGuards(FinancialAccessGuard) events(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.harvests.events(id, this.ctx(r)); }
  @Get(':id/closure-checklist') @UseGuards(FinancialAccessGuard) checklistRead(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.harvests.checklistRead(id, this.ctx(r)); }
  @Get(':id/frozen-pnl') @UseGuards(FinancialAccessGuard) frozenPnl(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.harvests.frozenPnl(id, this.ctx(r)); }
  @Get() @UseGuards(FinancialAccessGuard) closed(@Query('status') status: string | undefined, @Req() r: AuthenticatedRequest) { return this.harvests.closed(this.ctx(r), status); }
  @Post(':id/close')
  @ApiResponse({ status: 201, type: CloseCropResponseDto })
  close(@Param('id') id: string, @Req() r: AuthenticatedRequest): Promise<CloseCropResponseDto> { return this.harvests.close(id, this.ctx(r)); }
  @Post(':id/closure-checklist') checklist(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.harvests.checklist(id, this.ctx(r)); }
  @Post(':id/closure-checklist/:step') executeStep(@Param('id') id: string, @Param('step') step: string, @Body('note') note: string | undefined, @Req() r: AuthenticatedRequest) { return this.harvests.executeStep(id, step, note, this.ctx(r)); }
  @Post(':id/reopen') reopen(@Param('id') id: string, @Body('reason') reason: string, @Req() r: AuthenticatedRequest) { return this.harvests.reopen(id, reason, this.ctx(r)); }
}
