import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { MasterContext, MastersService } from './masters.service';

export class FarmDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() lat?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() lng?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() totalExtentAcres?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() waterSourceType?: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) electricityServiceNumbers!: string[];
}
export class PondDto {
  @ApiProperty() @IsString() farmId!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsNumber() extentAcres!: number;
  @ApiProperty() @IsString() ownershipType!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() waterDepthM?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() pondType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() shape?: string;
}
export class LeaseAgreementDto {
  @ApiProperty() @IsString() landlordName!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() landlordContact?: string;
  @ApiProperty() @IsNumber() extentAcres!: number;
  @ApiProperty() @IsString() ratePerAcrePerAnnumPaise!: string;
  @ApiProperty() @IsString() startDate!: string;
  @ApiProperty() @IsString() endDate!: string;
  @ApiProperty() @IsString() paymentFrequency!: string;
  @ApiProperty() @IsString() advancePaise!: string;
  @ApiProperty() @IsBoolean() advanceRefundable!: boolean;
  @ApiProperty({ required: false }) @IsOptional() escalationJson?: object;
  @ApiProperty({ required: false }) @IsOptional() @IsString() documentKey?: string;
}
export class SpeciesDto {
  @ApiProperty() @IsString() category!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() defaultDocDays?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() defaultTargetSizeG?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() defaultSurvivalPct?: number;
  @ApiProperty({ required: false }) @IsOptional() waterParamRanges?: object;
}
export class FeedItemDto {
  @ApiProperty() @IsString() brand!: string;
  @ApiProperty() @IsString() feedType!: string;
  @ApiProperty() @IsString() gradeCode!: string;
  @ApiProperty() @IsNumber() bagWeightKg!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() supplierId?: string;
}
export class FeedRateDto {
  @ApiProperty() @IsString() feedItemId!: string;
  @ApiProperty() @IsString() effectiveFrom!: string;
  @ApiProperty() @IsString() ratePerKgPaise!: string;
}
export class MedicineItemDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() category!: string;
  @ApiProperty() @IsString() unit!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() packSize?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() supplierId?: string;
}
export class MedicineRateDto {
  @ApiProperty() @IsString() medicineItemId!: string;
  @ApiProperty() @IsString() effectiveFrom!: string;
  @ApiProperty() @IsString() ratePerUnitPaise!: string;
}

@UseGuards(JwtGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly masters: MastersService) {}
  private user(req: AuthenticatedRequest) {
    const u = req.user!;
    return { userId: u.id, businessId: u.businessId!, role: u.role ?? 'OPERATOR', financialAccess: u.financialAccess, pondScope: u.pondScope };
  }
  private context(req: AuthenticatedRequest): MasterContext {
    return { businessId: req.user!.businessId!, userId: req.user!.id, deviceId: req.user!.deviceId };
  }
  @Get('farms')
  farms(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.farm, this.user(req)); }
  @Get('ponds')
  ponds(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.pond, this.user(req), true); }
  @Get('lease-agreements')
  leases(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.leaseAgreement, this.user(req), false, true); }
  @Get('species')
  species(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.species, this.user(req)); }
  @Get('farms/:id')
  farm(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.masters.get(this.masters.farm, id, this.user(req)); }
  @Get('ponds/:id')
  pond(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.masters.get(this.masters.pond, id, this.user(req), true); }
  @Post('farms')
  createFarm(@Body() body: FarmDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.farm, {
      name: body.name, address: body.address, lat: body.lat, lng: body.lng,
      totalExtentAcres: body.totalExtentAcres, waterSourceType: body.waterSourceType,
      electricityServiceNumbers: body.electricityServiceNumbers,
    }, this.context(req));
  }
  @Post('ponds')
  createPond(@Body() body: PondDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.pond, {
      farmId: body.farmId, code: body.code, name: body.name, extentAcres: body.extentAcres,
      ownershipType: body.ownershipType, waterDepthM: body.waterDepthM, pondType: body.pondType, shape: body.shape,
    }, this.context(req));
  }
  @Post('lease-agreements')
  createLease(@Body() body: LeaseAgreementDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.leaseAgreement, {
      landlordName: body.landlordName, landlordContact: body.landlordContact,
      extentAcres: body.extentAcres, ratePerAcrePerAnnumPaise: BigInt(body.ratePerAcrePerAnnumPaise),
      startDate: new Date(body.startDate), endDate: new Date(body.endDate),
      paymentFrequency: body.paymentFrequency, advancePaise: BigInt(body.advancePaise),
      advanceRefundable: body.advanceRefundable, escalationJson: body.escalationJson, documentKey: body.documentKey,
    }, this.context(req));
  }
  @Post('species')
  createSpecies(@Body() body: SpeciesDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.species, {
      category: body.category, name: body.name, defaultDocDays: body.defaultDocDays,
      defaultTargetSizeG: body.defaultTargetSizeG, defaultSurvivalPct: body.defaultSurvivalPct,
      waterParamRanges: body.waterParamRanges,
    }, this.context(req));
  }
  @Get('feed-items')
  feedItems(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.feedItem, this.user(req)); }
  @Get('feed-rate-history')
  feedRates(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.feedRateHistory, this.user(req)); }
  @Get('medicine-items')
  medicineItems(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.medicineItem, this.user(req)); }
  @Get('medicine-rate-history')
  medicineRates(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.medicineRateHistory, this.user(req)); }
  @Post('feed-items')
  createFeed(@Body() body: FeedItemDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.feedItem, {
      brand: body.brand, feedType: body.feedType, gradeCode: body.gradeCode,
      bagWeightKg: body.bagWeightKg, supplierId: body.supplierId,
    }, this.context(req));
  }
  @Post('feed-rate-history')
  createFeedRate(@Body() body: FeedRateDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.feedRateHistory, {
      feedItemId: body.feedItemId, effectiveFrom: new Date(body.effectiveFrom),
      ratePerKgPaise: BigInt(body.ratePerKgPaise),
    }, this.context(req));
  }
  @Post('medicine-items')
  createMedicine(@Body() body: MedicineItemDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.medicineItem, {
      name: body.name, category: body.category, unit: body.unit,
      packSize: body.packSize, supplierId: body.supplierId,
    }, this.context(req));
  }
  @Post('medicine-rate-history')
  createMedicineRate(@Body() body: MedicineRateDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.medicineRateHistory, {
      medicineItemId: body.medicineItemId, effectiveFrom: new Date(body.effectiveFrom),
      ratePerUnitPaise: BigInt(body.ratePerUnitPaise),
    }, this.context(req));
  }
}
