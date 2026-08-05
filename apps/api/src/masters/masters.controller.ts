import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { MasterContext, MastersService } from './masters.service';
import { UserRole } from '../auth/roles';
import { FinancialAccessGuard } from '../auth/roles.guard';

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
  @ApiProperty({ required: false, type: Array }) @IsOptional() customSchedule?: Array<{ dueDate: string; amountPaise: string }>;
  @ApiProperty({ required: false }) @IsOptional() @IsString() pondId?: string;
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
export class FeedItemOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() brand!: string;
  @ApiProperty() feedType!: string;
  @ApiProperty() gradeCode!: string;
  @ApiProperty() bagWeightKg!: string;
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
export class MedicineItemOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty() unit!: string;
}
export class MedicineRateDto {
  @ApiProperty() @IsString() medicineItemId!: string;
  @ApiProperty() @IsString() effectiveFrom!: string;
  @ApiProperty() @IsString() ratePerUnitPaise!: string;
}
export class PartyDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) type!: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() mobile?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() openingBalancePaise?: string;
}
export class PartyListDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [String] }) type!: string[];
  @ApiProperty({ required: false }) mobile?: string;
  @ApiProperty({ required: false }) address?: string;
  @ApiProperty({ required: false }) openingBalancePaise?: string;
}
export class SupplierCreditDto {
  @ApiProperty() @IsString() partyId!: string;
  @ApiProperty() @IsString() limitPaise!: string;
  @ApiProperty() @IsNumber() creditPeriodDays!: number;
  @ApiProperty() @IsString() effectiveFrom!: string;
}
export class MarketRateDto {
  @ApiProperty() @IsString() rateDate!: string;
  @ApiProperty() @IsString() region!: string;
  @ApiProperty() @IsString() speciesId!: string;
  @ApiProperty() @IsString() basis!: string;
  @ApiProperty() @IsString() key!: string;
  @ApiProperty() @IsString() ratePerKgPaise!: string;
}
export class LabourDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() mobile?: string;
  @ApiProperty() @IsString() engagementType!: string;
  @ApiProperty() @IsString() defaultRatePaise!: string;
  @ApiProperty() @IsString() rateBasis!: string;
}
export class AssetDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() category!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() pondId?: string;
  @ApiProperty() @IsString() purchaseDate!: string;
  @ApiProperty() @IsString() costPaise!: string;
  @ApiProperty() @IsNumber() salvagePct!: number;
  @ApiProperty() @IsNumber() usefulLifeYears!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() disposalDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() disposalValuePaise?: string;
}
export class CostHeadDto {
  @ApiProperty() @IsString() code!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() classification!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() defaultAllocationBasis?: string;
}
export class CostHeadListDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() classification!: string;
  @ApiProperty({ required: false }) defaultAllocationBasis?: string;
}
export class PreparationTemplateDto {
  @ApiProperty() @IsString() speciesCategory!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() items!: object[];
}
export class PondAttentionDto {
  @ApiProperty({ enum: ['GREEN', 'AMBER', 'RED'] }) state!: 'GREEN' | 'AMBER' | 'RED';
  @ApiProperty() reason!: string;
  @ApiProperty({ type: [String] }) signals!: string[];
}
export class FigureDerivationDto {
  @ApiProperty({ type: [String] }) inputs!: string[];
  @ApiProperty({ type: [String] }) steps!: string[];
}
export class OperationalFigureDto {
  @ApiProperty({ nullable: true, type: String }) value!: string | null;
  @ApiProperty() unit!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ required: false }) reason?: string;
  @ApiProperty({ type: FigureDerivationDto }) derivation!: FigureDerivationDto;
}
export class ActiveCropDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: OperationalFigureDto }) doc!: OperationalFigureDto;
  @ApiProperty({ type: OperationalFigureDto }) abw!: OperationalFigureDto;
  @ApiProperty({ type: OperationalFigureDto }) biomass!: OperationalFigureDto;
  @ApiProperty({ type: OperationalFigureDto }) fcr!: OperationalFigureDto;
  @ApiProperty({ type: OperationalFigureDto }) density!: OperationalFigureDto;
}
export class PondListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() businessId!: string;
  @ApiProperty() farmId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() extentAcres!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: PondAttentionDto }) attention!: PondAttentionDto;
  @ApiProperty({ nullable: true, type: ActiveCropDto }) activeCrop!: ActiveCropDto | null;
}

@UseGuards(JwtGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly masters: MastersService) {}
  private user(req: AuthenticatedRequest) {
    const u = req.user!;
    return { userId: u.id, businessId: u.businessId!, role: (u.role ?? UserRole.OPERATOR) as UserRole, financialAccess: u.financialAccess, pondScope: u.pondScope };
  }
  private context(req: AuthenticatedRequest): MasterContext {
    return { businessId: req.user!.businessId!, userId: req.user!.id, deviceId: req.user!.deviceId };
  }
  @Get('farms')
  farms(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.farm, this.user(req)); }
  @Get('ponds')
  @ApiResponse({ status: 200, type: [PondListItemDto] })
  ponds(@Req() req: AuthenticatedRequest) { return this.masters.listPonds(this.user(req)); }
  @Get('lease-agreements')
  leases(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.leaseAgreement, this.user(req), false, true); }
  @Get('species')
  species(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.species, this.user(req), false, false, true); }
  @Get('farms/:id')
  farm(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.masters.get(this.masters.farm, id, this.user(req)); }
  @Get('ponds/:id')
  @ApiResponse({ status: 200, type: PondListItemDto })
  pond(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.masters.getPond(id, this.user(req)); }
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
      ownershipType: body.ownershipType, waterDepthM: body.waterDepthM, pondType: body.pondType, shape: body.shape, status: 'IDLE',
    }, this.context(req));
  }
  @Post('lease-agreements')
  createLease(@Body() body: LeaseAgreementDto, @Req() req: AuthenticatedRequest) {
    return this.masters.createLease({
      landlordName: body.landlordName, landlordContact: body.landlordContact,
      extentAcres: body.extentAcres, ratePerAcrePerAnnumPaise: BigInt(body.ratePerAcrePerAnnumPaise),
      startDate: new Date(body.startDate), endDate: new Date(body.endDate),
      paymentFrequency: body.paymentFrequency, advancePaise: BigInt(body.advancePaise),
      advanceRefundable: body.advanceRefundable, escalationJson: body.escalationJson, documentKey: body.documentKey,
      customSchedule: body.customSchedule, pondId: body.pondId,
    }, this.context(req));
  }
  @Patch('lease-agreements/:id')
  updateLease(@Param('id') id: string, @Body() body: LeaseAgreementDto, @Req() req: AuthenticatedRequest) {
    return this.masters.updateLease(id, {
      landlordName: body.landlordName, landlordContact: body.landlordContact,
      extentAcres: body.extentAcres, ratePerAcrePerAnnumPaise: BigInt(body.ratePerAcrePerAnnumPaise),
      startDate: new Date(body.startDate), endDate: new Date(body.endDate),
      paymentFrequency: body.paymentFrequency, advancePaise: BigInt(body.advancePaise),
      advanceRefundable: body.advanceRefundable, escalationJson: body.escalationJson, documentKey: body.documentKey,
      pondId: body.pondId,
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
  @ApiResponse({ status: 200, type: [FeedItemOptionDto] })
  @Get('feed-items')
  feedItems(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.feedItem, this.user(req)); }
  @Get('feed-rate-history')
  feedRates(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.feedRateHistory, this.user(req)); }
  @ApiResponse({ status: 200, type: [MedicineItemOptionDto] })
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
  @Get('parties')
  @ApiResponse({ status: 200, type: [PartyListDto] })
  parties(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.party, this.user(req)); }
  @Get('supplier-credit-limits')
  supplierCredits(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.supplierCreditLimit, this.user(req), false, true); }
  @Get('market-rates')
  @UseGuards(FinancialAccessGuard)
  marketRates(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.marketRateReference, this.user(req), false, true, true); }
  @Get('labour')
  labour(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.labour, this.user(req)); }
  @Get('assets')
  assets(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.asset, this.user(req), false, true); }
  @Post('parties')
  createParty(@Body() body: PartyDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.party, {
      name: body.name, type: body.type, mobile: body.mobile, address: body.address,
      openingBalancePaise: BigInt(body.openingBalancePaise ?? '0'),
    }, this.context(req));
  }
  @Post('supplier-credit-limits')
  createSupplierCredit(@Body() body: SupplierCreditDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.supplierCreditLimit, {
      partyId: body.partyId, limitPaise: BigInt(body.limitPaise), creditPeriodDays: body.creditPeriodDays,
      effectiveFrom: new Date(body.effectiveFrom),
    }, this.context(req));
  }
  @Post('market-rates')
  @UseGuards(FinancialAccessGuard)
  createMarketRate(@Body() body: MarketRateDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.marketRateReference, {
      rateDate: new Date(body.rateDate), region: body.region, speciesId: body.speciesId,
      basis: body.basis, key: body.key, ratePerKgPaise: BigInt(body.ratePerKgPaise),
    }, this.context(req));
  }
  @Post('labour')
  createLabour(@Body() body: LabourDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.labour, {
      name: body.name, mobile: body.mobile, engagementType: body.engagementType,
      defaultRatePaise: BigInt(body.defaultRatePaise), rateBasis: body.rateBasis,
    }, this.context(req));
  }
  @Post('assets')
  createAsset(@Body() body: AssetDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.asset, {
      name: body.name, category: body.category, pondId: body.pondId, purchaseDate: new Date(body.purchaseDate),
      costPaise: BigInt(body.costPaise), salvagePct: body.salvagePct, usefulLifeYears: body.usefulLifeYears,
      disposalDate: body.disposalDate ? new Date(body.disposalDate) : undefined,
      disposalValuePaise: body.disposalValuePaise ? BigInt(body.disposalValuePaise) : undefined,
    }, this.context(req));
  }
  @Get('cost-heads')
  @ApiResponse({ status: 200, type: [CostHeadListDto] })
  costHeads(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.costHead, this.user(req), false, true, true); }
  @Get('preparation-templates')
  preparationTemplates(@Req() req: AuthenticatedRequest) { return this.masters.list(this.masters.preparationTemplate, this.user(req)); }
  @Post('cost-heads')
  createCostHead(@Body() body: CostHeadDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.costHead, {
      code: body.code, name: body.name, classification: body.classification,
      defaultAllocationBasis: body.defaultAllocationBasis,
    }, this.context(req));
  }
  @Post('preparation-templates')
  createPreparationTemplate(@Body() body: PreparationTemplateDto, @Req() req: AuthenticatedRequest) {
    return this.masters.create(this.masters.preparationTemplate, {
      speciesCategory: body.speciesCategory, name: body.name, items: body.items,
    }, this.context(req));
  }
  @Get('feed-items/:id') feedItem(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.feedItem, id, this.user(r)); }
  @Get('feed-rate-history/:id') feedRate(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.feedRateHistory, id, this.user(r)); }
  @Get('medicine-items/:id') medicineItem(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.medicineItem, id, this.user(r)); }
  @Get('medicine-rate-history/:id') medicineRate(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.medicineRateHistory, id, this.user(r)); }
  @Get('parties/:id') party(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.party, id, this.user(r)); }
  @Get('supplier-credit-limits/:id') supplierCredit(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.supplierCreditLimit, id, this.user(r), false, true); }
  @Get('labour/:id') labourItem(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.labour, id, this.user(r)); }
  @Get('assets/:id') asset(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.asset, id, this.user(r), false, true); }
  @Get('cost-heads/:id') costHead(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.costHead, id, this.user(r), false, true, true); }
  @Get('preparation-templates/:id') preparationTemplate(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.masters.get(this.masters.preparationTemplate, id, this.user(r)); }

  @Patch('feed-items/:id') updateFeed(@Param('id') id: string, @Body() b: FeedItemDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.feedItem, id, b, this.context(r)); }
  @Patch('feed-rate-history/:id') updateFeedRate(@Param('id') id: string, @Body() b: FeedRateDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.feedRateHistory, id, b, this.context(r)); }
  @Patch('medicine-items/:id') updateMedicine(@Param('id') id: string, @Body() b: MedicineItemDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.medicineItem, id, b, this.context(r)); }
  @Patch('medicine-rate-history/:id') updateMedicineRate(@Param('id') id: string, @Body() b: MedicineRateDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.medicineRateHistory, id, b, this.context(r)); }
  @Patch('parties/:id') updateParty(@Param('id') id: string, @Body() b: PartyDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.party, id, b, this.context(r)); }
  @Patch('supplier-credit-limits/:id') updateSupplierCredit(@Param('id') id: string, @Body() b: SupplierCreditDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.supplierCreditLimit, id, b, this.context(r)); }
  @Patch('labour/:id') updateLabour(@Param('id') id: string, @Body() b: LabourDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.labour, id, b, this.context(r)); }
  @Patch('assets/:id') updateAsset(@Param('id') id: string, @Body() b: AssetDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.asset, id, b, this.context(r)); }
  @Patch('cost-heads/:id') updateCostHead(@Param('id') id: string, @Body() b: CostHeadDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.costHead, id, b, this.context(r)); }
  @Patch('preparation-templates/:id') updatePreparationTemplate(@Param('id') id: string, @Body() b: PreparationTemplateDto, @Req() r: AuthenticatedRequest) { return this.masters.update(this.masters.preparationTemplate, id, b, this.context(r)); }
}
