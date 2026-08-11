import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { FinancialAccessGuard } from '../auth/roles.guard';
import { FinanceService } from './finance.service';
import { ApiResponse } from '@nestjs/swagger';
import { AssetRegisterReportDto, BusinessPnlReportDto, CashReportDto, CostHeadAnalysisReportDto, CostSheetReportDto, CropSummaryReportDto, EstimateVsActualReportDto, LeaseRegisterReportDto, LifetimeProfitabilityReportDto, PondHistoryReportDto, ProfitabilityReportDto } from './report.dto';

export class LedgerEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() date!: string;
  @ApiProperty() amountPaise!: string;
  @ApiProperty({ required: false }) status?: string;
}
export class PartyLedgerResponseDto {
  @ApiProperty() partyId!: string;
  @ApiProperty() partyName!: string;
  @ApiProperty({ type: [LedgerEntryDto] }) entries!: LedgerEntryDto[];
}
export class PayableDto {
  @ApiProperty() id!: string;
  @ApiProperty() expenseDate!: string;
  @ApiProperty() partyId!: string;
  @ApiProperty() amountPaise!: string;
  @ApiProperty() paidAmountPaise!: string;
  @ApiProperty() paymentStatus!: string;
}
export class ReceivableDto {
  @ApiProperty() id!: string;
  @ApiProperty() harvestDate!: string;
  @ApiProperty() receivablePaise!: string;
  @ApiProperty({ required: false }) dueDate?: string;
}
export class SupplierHeadroomDto {
  @ApiProperty() limitPaise!: string;
  @ApiProperty() usedPaise!: string;
  @ApiProperty() headroomPaise!: string;
}

class ExpenseDto { @ApiProperty() @IsString() expenseDate!: string; @ApiProperty() @IsString() costHeadId!: string; @ApiProperty() @IsIn(['POND_CROP','COMMON']) allocationTarget!: 'POND_CROP'|'COMMON'; @ApiProperty({ required: false }) @IsOptional() @IsString() pondId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() cropId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() commonPoolId?: string; @ApiProperty() @IsString() amountPaise!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() quantity?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() ratePaise?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() partyId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() paymentStatus?: 'PAID'|'UNPAID'|'PART_PAID'; @ApiProperty({ required: false }) @IsOptional() @IsString() paymentMode?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() paymentReference?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() billKey?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() remarks?: string; @ApiProperty({ required: false }) @IsOptional() @IsBoolean() ratePending?: boolean; }
class PaymentDto { @ApiProperty() @IsString() partyId!: string; @ApiProperty() @IsString() paidOn!: string; @ApiProperty() @IsString() direction!: string; @ApiProperty() @IsString() amountPaise!: string; @ApiProperty() @IsString() mode!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() reference?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string; }
class LeasePaymentDto { @ApiProperty() @IsString() scheduleId!: string; @ApiProperty() @IsString() paidOn!: string; @ApiProperty() @IsString() amountPaise!: string; @ApiProperty() @IsString() mode!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() reference?: string; }

@UseGuards(JwtGuard, FinancialAccessGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  private ctx(r: AuthenticatedRequest) { return { businessId: r.user!.businessId!, userId: r.user!.id, deviceId: r.user!.deviceId, role: r.user!.role, pondScope: r.user!.pondScope }; }
  @Post('expenses') expense(@Body() b: ExpenseDto, @Req() r: AuthenticatedRequest) { return this.finance.expense(b, this.ctx(r)); }
  @Post('payments') payment(@Body() b: PaymentDto, @Req() r: AuthenticatedRequest) { return this.finance.payment(b, this.ctx(r)); }
  @Post('lease-payments') leasePayment(@Body() b: LeasePaymentDto, @Req() r: AuthenticatedRequest) { return this.finance.leasePayment(b, this.ctx(r)); }
  @Get('parties/:id/ledger') @ApiResponse({ type: PartyLedgerResponseDto }) ledger(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.finance.ledger(id, this.ctx(r)); }
  @Get('payables') @ApiResponse({ type: [PayableDto] }) payables(@Req() r: AuthenticatedRequest) { return this.finance.payables(this.ctx(r)); }
  @Get('receivables') @ApiResponse({ type: [ReceivableDto] }) receivables(@Req() r: AuthenticatedRequest) { return this.finance.receivables(this.ctx(r)); }
  @Get('suppliers/:id/headroom') @ApiResponse({ type: SupplierHeadroomDto }) headroom(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.finance.supplierHeadroom(id, this.ctx(r)); }
  @Get('crops/:cropId/input-value/:itemId') inputValue(@Param('cropId') cropId: string, @Param('itemId') itemId: string, @Req() r: AuthenticatedRequest) { return this.finance.valueInput(cropId, itemId, this.ctx(r)); }
  @Get('reports/cash') @ApiResponse({ type: CashReportDto }) cash(@Req() r: AuthenticatedRequest) { return this.finance.cashView(this.ctx(r)); }
  @Get('reports/profitability') @ApiResponse({ type: ProfitabilityReportDto }) profitability(@Req() r: AuthenticatedRequest) { return this.finance.profitabilityView(this.ctx(r)); }
  @Get('reports/crop-summary') @ApiResponse({ type: CropSummaryReportDto }) cropSummary(@Req() r: AuthenticatedRequest) { return this.finance.cropSummary(this.ctx(r)); }
  @Get('reports/cost-sheet') @ApiResponse({ type: CostSheetReportDto }) costSheet(@Req() r: AuthenticatedRequest) { return this.finance.costSheet(this.ctx(r)); }
  @Get('reports/estimate-vs-actual') @ApiResponse({ type: EstimateVsActualReportDto }) estimateVsActual(@Req() r: AuthenticatedRequest) { return this.finance.estimateVsActual(this.ctx(r)); }
  @Get('reports/pond-history') @ApiResponse({ type: PondHistoryReportDto }) pondHistory(@Req() r: AuthenticatedRequest) { return this.finance.pondHistory(this.ctx(r)); }
  @Get('reports/lifetime-profitability') @ApiResponse({ type: LifetimeProfitabilityReportDto }) lifetimeProfitability(@Req() r: AuthenticatedRequest) { return this.finance.lifetimeProfitability(this.ctx(r)); }
  @Get('reports/business-pnl') @ApiResponse({ type: BusinessPnlReportDto }) businessPnl(@Req() r: AuthenticatedRequest) { return this.finance.businessPnl(this.ctx(r)); }
  @Get('reports/insights') insights(@Req() r: AuthenticatedRequest) { return this.finance.insights(this.ctx(r)); }
  @Get('reports/cost-head-analysis') @ApiResponse({ type: CostHeadAnalysisReportDto }) costHeadAnalysis(@Req() r: AuthenticatedRequest) { return this.finance.costHeadAnalysis(this.ctx(r)); }
  @Get('reports/asset-register') @ApiResponse({ type: AssetRegisterReportDto }) assetRegister(@Req() r: AuthenticatedRequest) { return this.finance.assetRegister(this.ctx(r)); }
  @Get('reports/lease-register') @ApiResponse({ type: LeaseRegisterReportDto }) leaseRegister(@Req() r: AuthenticatedRequest) { return this.finance.leaseRegister(this.ctx(r)); }
}
