import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { OperationsService } from './operations.service';

class FeedDto { @ApiProperty() @IsString() logDate!: string; @ApiProperty() @IsString() mealSlot!: string; @ApiProperty() @IsString() feedItemId!: string; @ApiProperty() @IsString() quantityKg!: string; @ApiProperty({ required: false }) @IsOptional() @IsNumber() bags?: number; @ApiProperty({ required: false }) @IsOptional() @IsString() looseKg?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() remarks?: string; }
class FeedBulkDto { @ApiProperty({ type: [FeedDto] }) @IsArray() rows!: FeedDto[]; }
class SameYesterdayDto { @ApiProperty() @IsString() date!: string; }
class TrayDto { @ApiProperty() @IsString() trayCode!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() position?: string; @ApiProperty() @IsString() feedPlacedKg!: string; @ApiProperty() @IsNumber() checkIntervalMin!: number; }
class TrayReadingDto { @ApiProperty() @IsString() checkTrayId!: string; @ApiProperty() @IsString() readAt!: string; @ApiProperty() @IsString() feedPlacedKg!: string; @ApiProperty() @IsString() residualCode!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() residualWeightG?: string; }
class GrowthDto { @ApiProperty() @IsString() sampledOn!: string; @ApiProperty() @IsNumber() doc!: number; @ApiProperty() @IsNumber() animalsInSample!: number; @ApiProperty() @IsString() sampleWeightG!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() speciesId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() healthNotes?: string; }

@UseGuards(JwtGuard)
@Controller('crops')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}
  private ctx(r: AuthenticatedRequest) { return { businessId: r.user!.businessId!, userId: r.user!.id, deviceId: r.user!.deviceId }; }
  @Post(':id/feed-logs') feed(@Param('id') id: string, @Body() body: FeedDto, @Req() r: AuthenticatedRequest) { return this.operations.feed(id, body, this.ctx(r)); }
  @Post(':id/feed-logs/bulk') bulk(@Param('id') id: string, @Body() body: FeedBulkDto, @Req() r: AuthenticatedRequest) { return this.operations.feedBulk(id, body.rows, this.ctx(r)); }
  @Post(':id/feed-logs/same-as-yesterday') same(@Param('id') id: string, @Body() body: SameYesterdayDto, @Req() r: AuthenticatedRequest) { return this.operations.feedSameAsYesterday(id, body.date, this.ctx(r)); }
  @Post(':id/check-trays') tray(@Param('id') id: string, @Body() body: TrayDto, @Req() r: AuthenticatedRequest) { return this.operations.checkTray(id, body, this.ctx(r)); }
  @Post(':id/check-tray-readings') trayReading(@Param('id') id: string, @Body() body: TrayReadingDto, @Req() r: AuthenticatedRequest) { return this.operations.checkTrayReading(id, body, this.ctx(r)); }
  @Post(':id/growth-samples') growth(@Param('id') id: string, @Body() body: GrowthDto, @Req() r: AuthenticatedRequest) { return this.operations.growth(id, body, this.ctx(r)); }
}
