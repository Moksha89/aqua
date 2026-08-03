import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { OperationsService } from './operations.service';

class FeedDto { @ApiProperty() @IsString() logDate!: string; @ApiProperty() @IsString() mealSlot!: string; @ApiProperty() @IsString() feedItemId!: string; @ApiProperty() @IsString() quantityKg!: string; @ApiProperty({ required: false }) @IsOptional() @IsNumber() bags?: number; @ApiProperty({ required: false }) @IsOptional() @IsString() looseKg?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() remarks?: string; }
class FeedBulkDto { @ApiProperty({ type: [FeedDto] }) @IsArray() rows!: FeedDto[]; }
class SameYesterdayDto { @ApiProperty() @IsString() date!: string; }
class TrayDto { @ApiProperty() @IsString() trayCode!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() position?: string; @ApiProperty() @IsString() feedPlacedKg!: string; @ApiProperty() @IsNumber() checkIntervalMin!: number; }
class TrayReadingDto { @ApiProperty() @IsString() checkTrayId!: string; @ApiProperty() @IsString() readAt!: string; @ApiProperty() @IsString() feedPlacedKg!: string; @ApiProperty() @IsString() residualCode!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() residualWeightG?: string; }
class GrowthDto { @ApiProperty() @IsString() sampledOn!: string; @ApiProperty() @IsNumber() doc!: number; @ApiProperty() @IsNumber() animalsInSample!: number; @ApiProperty() @IsString() sampleWeightG!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() speciesId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() healthNotes?: string; }
class WaterDto { @ApiProperty({ required: false }) @IsOptional() @IsString() cropId?: string; @ApiProperty() @IsString() readAt!: string; @ApiProperty() @IsString() slot!: string; @ApiProperty() @IsString() source!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() salinityPpt?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() ph?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() alkalinity?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() hardness?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() doMgl?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() temperatureC?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() ammonia?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() nitrite?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() transparencyCm?: string; }
class MedicineDto { @ApiProperty() @IsString() appliedOn!: string; @ApiProperty() @IsString() medicineItemId!: string; @ApiProperty() @IsString() quantity!: string; @ApiProperty() @IsString() unit!: string; @ApiProperty() @IsString() method!: string; @ApiProperty() @IsString() reason!: string; @ApiProperty() @IsString() costPaise!: string; }
class HealthDto { @ApiProperty() @IsString() eventDate!: string; @ApiProperty() @IsNumber() doc!: number; @ApiProperty({ type: [String] }) @IsArray() symptoms!: string[]; @ApiProperty({ required: false }) @IsOptional() @IsNumber() mortalityCount?: number; @ApiProperty() @IsBoolean() labTested!: boolean; }
class AttendanceDto { @ApiProperty() @IsString() labourId!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() pondId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() cropId?: string; @ApiProperty() @IsString() workDate!: string; @ApiProperty() @IsString() days!: string; @ApiProperty() @IsString() amountPaise!: string; }

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
  @Post(':id/medicine-applications') medicine(@Param('id') id: string, @Body() body: MedicineDto, @Req() r: AuthenticatedRequest) { return this.operations.medicine(id, body, this.ctx(r)); }
  @Post(':id/health-events') health(@Param('id') id: string, @Body() body: HealthDto, @Req() r: AuthenticatedRequest) { return this.operations.health(id, body, this.ctx(r)); }
  @Post(':id/attendance') attendance(@Body() body: AttendanceDto, @Req() r: AuthenticatedRequest) { return this.operations.attendance(body, this.ctx(r)); }
  @Post('/ponds/:id/water-readings') water(@Param('id') id: string, @Body() body: WaterDto, @Req() r: AuthenticatedRequest) { return this.operations.water(id, body, this.ctx(r)); }
}
