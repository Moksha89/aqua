import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { HarvestService } from './harvest.service';
class HarvestLineDto { @ApiProperty({ required: false }) @IsOptional() @IsString() speciesId?: string; @ApiProperty() @IsIn(['COUNT','GRADE']) basis!: 'COUNT'|'GRADE'; @ApiProperty() @IsString() key!: string; @ApiProperty() @IsString() quantityKg!: string; @ApiProperty() @IsString() ratePerKgPaise!: string; }
class HarvestDto { @ApiProperty() @IsString() harvestDate!: string; @ApiProperty() @IsNumber() doc!: number; @ApiProperty() @IsIn(['PARTIAL','FINAL']) type!: 'PARTIAL'|'FINAL'; @ApiProperty() @IsIn(['TARGET_SIZE','MARKET_RATE','DISEASE','SEASON_END','OTHER']) reason!: 'TARGET_SIZE'|'MARKET_RATE'|'DISEASE'|'SEASON_END'|'OTHER'; @ApiProperty() @IsBoolean() sampleTaken!: boolean; @ApiProperty({ required: false }) @IsOptional() @IsNumber() sampleCount?: number; @ApiProperty({ required: false }) @IsOptional() @IsString() sampleWeightG?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() buyerPartyId?: string; @ApiProperty({ type: [HarvestLineDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => HarvestLineDto) lines!: HarvestLineDto[]; }
@UseGuards(JwtGuard)
@Controller('crops')
export class HarvestController {
  constructor(private readonly harvests: HarvestService) {}
  private ctx(r: AuthenticatedRequest) { return { businessId: r.user!.businessId!, userId: r.user!.id, deviceId: r.user!.deviceId }; }
  @Post(':id/harvests') harvest(@Param('id') id: string, @Body() b: HarvestDto, @Req() r: AuthenticatedRequest) { return this.harvests.harvest(id, b, this.ctx(r)); }
  @Post(':id/close') close(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.harvests.close(id, this.ctx(r)); }
  @Post(':id/closure-checklist') checklist(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.harvests.checklist(id, this.ctx(r)); }
}
