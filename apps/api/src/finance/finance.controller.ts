import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { FinanceService } from './finance.service';

class ExpenseDto { @ApiProperty() @IsString() expenseDate!: string; @ApiProperty() @IsString() costHeadId!: string; @ApiProperty() @IsIn(['POND_CROP','COMMON']) allocationTarget!: 'POND_CROP'|'COMMON'; @ApiProperty({ required: false }) @IsOptional() @IsString() pondId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() cropId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() commonPoolId?: string; @ApiProperty() @IsString() amountPaise!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() quantity?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() ratePaise?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() partyId?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() paymentStatus?: 'PAID'|'UNPAID'|'PART_PAID'; @ApiProperty({ required: false }) @IsOptional() @IsString() paymentMode?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() paymentReference?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() billKey?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() remarks?: string; @ApiProperty({ required: false }) @IsOptional() @IsBoolean() ratePending?: boolean; }
class PaymentDto { @ApiProperty() @IsString() partyId!: string; @ApiProperty() @IsString() paidOn!: string; @ApiProperty() @IsString() direction!: string; @ApiProperty() @IsString() amountPaise!: string; @ApiProperty() @IsString() mode!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() reference?: string; @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string; }
class LeasePaymentDto { @ApiProperty() @IsString() scheduleId!: string; @ApiProperty() @IsString() paidOn!: string; @ApiProperty() @IsString() amountPaise!: string; @ApiProperty() @IsString() mode!: string; @ApiProperty({ required: false }) @IsOptional() @IsString() reference?: string; }

@UseGuards(JwtGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  private ctx(r: AuthenticatedRequest) { return { businessId: r.user!.businessId!, userId: r.user!.id, deviceId: r.user!.deviceId }; }
  @Post('expenses') expense(@Body() b: ExpenseDto, @Req() r: AuthenticatedRequest) { return this.finance.expense(b, this.ctx(r)); }
  @Post('payments') payment(@Body() b: PaymentDto, @Req() r: AuthenticatedRequest) { return this.finance.payment(b, this.ctx(r)); }
  @Post('lease-payments') leasePayment(@Body() b: LeasePaymentDto, @Req() r: AuthenticatedRequest) { return this.finance.leasePayment(b, this.ctx(r)); }
  @Get('parties/:id/ledger') ledger(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.finance.ledger(id, this.ctx(r)); }
  @Get('payables') payables(@Req() r: AuthenticatedRequest) { return this.finance.payables(this.ctx(r)); }
  @Get('receivables') receivables(@Req() r: AuthenticatedRequest) { return this.finance.receivables(this.ctx(r)); }
  @Get('suppliers/:id/headroom') headroom(@Param('id') id: string, @Req() r: AuthenticatedRequest) { return this.finance.supplierHeadroom(id, this.ctx(r)); }
  @Get('crops/:cropId/input-value/:itemId') inputValue(@Param('cropId') cropId: string, @Param('itemId') itemId: string, @Req() r: AuthenticatedRequest) { return this.finance.valueInput(cropId, itemId, this.ctx(r)); }
  @Get('reports/cash') cash(@Req() r: AuthenticatedRequest) { return this.finance.cashView(this.ctx(r)); }
  @Get('reports/profitability') profitability(@Req() r: AuthenticatedRequest) { return this.finance.profitabilityView(this.ctx(r)); }
}
