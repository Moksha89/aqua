import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../platform/prisma.service';
import { paise, valueInput } from '../rules-engine';

import { UserRole } from '../auth/roles';
type Context = { businessId: string; userId: string; deviceId: string; role?: UserRole; pondScope?: string[] };
type ExpenseInput = { expenseDate: string; costHeadId: string; allocationTarget: 'POND_CROP' | 'COMMON'; pondId?: string; cropId?: string; commonPoolId?: string; amountPaise: string; quantity?: string; ratePaise?: string; partyId?: string; paymentStatus?: PaymentStatus; paymentMode?: string; paymentReference?: string; billKey?: string; remarks?: string; ratePending?: boolean };
type PaymentInput = { partyId: string; paidOn: string; direction: string; amountPaise: string; mode: string; reference?: string; notes?: string };
type LeasePaymentInput = { scheduleId: string; paidOn: string; amountPaise: string; mode: string; reference?: string };

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async expense(body: ExpenseInput, ctx: Context) {
    if (body.allocationTarget === 'POND_CROP' && (!body.pondId || !body.cropId)) throw new BadRequestException('Pond and crop are required');
    if (body.allocationTarget === 'COMMON' && !body.commonPoolId) throw new BadRequestException('Common pool is required');
    return this.prisma.$transaction(async (tx) => {
      if (body.pondId && ctx.role !== UserRole.OWNER && !(ctx.pondScope ?? []).includes('*') && !(ctx.pondScope ?? []).includes(body.pondId)) throw new BadRequestException('Pond is outside assigned scope');
      if (body.cropId) {
        const crop = await tx.crop.findFirst({ where: { id: body.cropId, businessId: ctx.businessId, voidedAt: null } });
        if (!crop) throw new NotFoundException('Crop not found');
        if (crop.status === 'CLOSED') throw new BadRequestException('Closed crops are read-only');
      }
      if (body.partyId) {
        const limit = await tx.supplierCreditLimit.findFirst({ where: { businessId: ctx.businessId, partyId: body.partyId, effectiveFrom: { lte: new Date(body.expenseDate) }, voidedAt: null }, orderBy: { effectiveFrom: 'desc' } });
        if (limit) {
          const outstanding = await tx.expense.aggregate({ where: { businessId: ctx.businessId, partyId: body.partyId, paymentStatus: { in: ['UNPAID', 'PART_PAID'] }, voidedAt: null }, _sum: { amountPaise: true } });
          if ((outstanding._sum.amountPaise ?? 0n) + BigInt(body.amountPaise) > limit.limitPaise) throw new BadRequestException('Supplier credit limit exceeded');
        }
      }
      return tx.expense.create({ data: { businessId: ctx.businessId, expenseDate: new Date(body.expenseDate), costHeadId: body.costHeadId, allocationTarget: body.allocationTarget, pondId: body.pondId, cropId: body.cropId, commonPoolId: body.commonPoolId, amountPaise: BigInt(body.amountPaise), quantity: body.quantity ? new Prisma.Decimal(body.quantity) : undefined, ratePaise: body.ratePaise ? BigInt(body.ratePaise) : undefined, partyId: body.partyId, paymentStatus: body.paymentStatus ?? 'UNPAID', paymentMode: body.paymentMode, paymentReference: body.paymentReference, billKey: body.billKey, remarks: body.remarks, ratePending: body.ratePending ?? false, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    });
  }

  async payment(body: PaymentInput, ctx: Context) {
    return this.prisma.payment.create({ data: { businessId: ctx.businessId, partyId: body.partyId, paidOn: new Date(body.paidOn), direction: body.direction, amountPaise: BigInt(body.amountPaise), mode: body.mode, reference: body.reference, notes: body.notes, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async leasePayment(body: LeasePaymentInput, ctx: Context) {
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.leasePaymentSchedule.findFirst({ where: { id: body.scheduleId, businessId: ctx.businessId, voidedAt: null } });
      if (!schedule) throw new NotFoundException('Lease schedule not found');
      if (BigInt(body.amountPaise) > schedule.amountPaise) throw new BadRequestException('Payment exceeds schedule amount');
      const payment = await tx.leasePayment.create({ data: { businessId: ctx.businessId, scheduleId: schedule.id, paidOn: new Date(body.paidOn), amountPaise: BigInt(body.amountPaise), mode: body.mode, reference: body.reference, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      await tx.leasePaymentSchedule.update({ where: { id: schedule.id }, data: { status: BigInt(body.amountPaise) === schedule.amountPaise ? 'PAID' : 'PART_PAID', updatedBy: ctx.userId } });
      return payment;
    });
  }

  async ledger(partyId: string, ctx: Context) {
    const [party, expenses, payments] = await Promise.all([
      this.prisma.party.findFirst({ where: { id: partyId, businessId: ctx.businessId, voidedAt: null } }),
      this.prisma.expense.findMany({ where: { partyId, businessId: ctx.businessId, voidedAt: null }, orderBy: { expenseDate: 'asc' } }),
      this.prisma.payment.findMany({ where: { partyId, businessId: ctx.businessId, voidedAt: null }, orderBy: { paidOn: 'asc' } }),
    ]);
    if (!party) throw new NotFoundException('Party not found');
    return {
      partyId: party.id,
      partyName: party.name,
      entries: [
        ...expenses.map((expense) => ({ id: expense.id, kind: 'EXPENSE', date: expense.expenseDate.toISOString(), amountPaise: expense.amountPaise, status: expense.paymentStatus })),
        ...payments.map((payment) => ({ id: payment.id, kind: 'PAYMENT', date: payment.paidOn.toISOString(), amountPaise: payment.amountPaise })),
      ].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async payables(ctx: Context) {
    const rows = await this.prisma.expense.findMany({ where: { businessId: ctx.businessId, partyId: { not: null }, paymentStatus: { in: ['UNPAID', 'PART_PAID'] }, voidedAt: null }, orderBy: { expenseDate: 'asc' } });
    return rows.map((row) => ({ id: row.id, expenseDate: row.expenseDate.toISOString(), partyId: row.partyId!, amountPaise: row.amountPaise, paidAmountPaise: row.paidAmountPaise, paymentStatus: row.paymentStatus }));
  }

  async receivables(ctx: Context) {
    const rows = await this.prisma.harvestEvent.findMany({ where: { businessId: ctx.businessId, receivablePaise: { gt: 0 }, voidedAt: null }, orderBy: { receivableDueDate: 'asc' } });
    return rows.map((row) => ({ id: row.id, harvestDate: row.harvestDate.toISOString(), receivablePaise: row.receivablePaise, dueDate: row.receivableDueDate?.toISOString() }));
  }

  async supplierHeadroom(partyId: string, ctx: Context) {
    const limit = await this.prisma.supplierCreditLimit.findFirst({ where: { businessId: ctx.businessId, partyId, voidedAt: null }, orderBy: { effectiveFrom: 'desc' } });
    if (!limit) throw new NotFoundException('Supplier credit limit not found');
    const outstanding = await this.prisma.expense.aggregate({ where: { businessId: ctx.businessId, partyId, paymentStatus: { in: ['UNPAID', 'PART_PAID'] }, voidedAt: null }, _sum: { amountPaise: true } });
    const used = outstanding._sum.amountPaise ?? 0n;
    return { limitPaise: limit.limitPaise, usedPaise: used, headroomPaise: limit.limitPaise - used };
  }

  async valueInput(cropId: string, itemId: string, ctx: Context) {
    const purchases = await this.prisma.expense.findMany({ where: { businessId: ctx.businessId, cropId, ratePending: false, voidedAt: null }, select: { quantity: true, ratePaise: true } });
    const rates = purchases.filter((p) => p.quantity && p.ratePaise).map((p) => ({ quantity: BigInt(Math.round(Number(p.quantity) * 1000)), ratePaise: paise(p.ratePaise!) }));
    const master = await this.prisma.feedRateHistory.findFirst({ where: { feedItemId: itemId, effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: 'desc' } });
    const result = valueInput(rates, master ? paise(master.ratePerKgPaise) : undefined);
    return { rate: result.rate, ratePending: result.ratePending };
  }

  async cashView(ctx: Context) {
    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({ where: { businessId: ctx.businessId, voidedAt: null }, orderBy: { paidOn: 'asc' } }),
      this.prisma.expense.findMany({ where: { businessId: ctx.businessId, voidedAt: null, paymentStatus: { in: ['PAID', 'PART_PAID'] } }, orderBy: { expenseDate: 'asc' } }),
    ]);
    return { view: 'CASH', payments, expenses };
  }

  async profitabilityView(ctx: Context) {
    const [crops, harvests, expenses, idle] = await Promise.all([
      this.prisma.crop.findMany({ where: { businessId: ctx.businessId, voidedAt: null } }),
      this.prisma.harvestEvent.findMany({ where: { businessId: ctx.businessId, voidedAt: null } }),
      this.prisma.expense.findMany({ where: { businessId: ctx.businessId, voidedAt: null, ratePending: false } }),
      this.prisma.idlePondCost.findMany({ where: { businessId: ctx.businessId, voidedAt: null } }),
    ]);
    return { view: 'PROFITABILITY', crops, harvests, expenses, idle };
  }

  async cropSummary(ctx: Context) {
    const crops = await this.prisma.crop.findMany({ where: { businessId: ctx.businessId, voidedAt: null } });
    const harvests = await this.prisma.harvestEvent.findMany({ where: { businessId: ctx.businessId, voidedAt: null } });
    return crops.map((crop) => ({ cropId: crop.id, harvestedPaise: harvests.filter((h) => h.cropId === crop.id).reduce((sum, h) => sum + h.netRealisationPaise, 0n), status: crop.status }));
  }
  async costSheet(ctx: Context) {
    const [direct, apportioned] = await Promise.all([
      this.prisma.expense.groupBy({ by: ['costHeadId'], where: { businessId: ctx.businessId, voidedAt: null, ratePending: false }, _sum: { amountPaise: true } }),
      this.prisma.apportionedCost.groupBy({ by: ['costHeadId'], where: { businessId: ctx.businessId, voidedAt: null }, _sum: { amountPaise: true } }),
    ]);
    return { direct, apportioned };
  }
  async estimateVsActual(ctx: Context) {
    const crops = await this.prisma.crop.findMany({ where: { businessId: ctx.businessId, voidedAt: null } });
    return crops.map((crop) => ({ cropId: crop.id, estimatedHarvestDate: crop.expectedHarvestDate, actualHarvestDate: crop.finalHarvestDate }));
  }
  async pondHistory(ctx: Context) {
    return this.prisma.pond.findMany({ where: { businessId: ctx.businessId, voidedAt: null }, select: { id: true, code: true, status: true } });
  }
  async lifetimeProfitability(ctx: Context) {
    const [harvests, idle] = await Promise.all([this.prisma.harvestEvent.aggregate({ where: { businessId: ctx.businessId, voidedAt: null }, _sum: { netRealisationPaise: true } }), this.prisma.idlePondCost.aggregate({ where: { businessId: ctx.businessId, voidedAt: null }, _sum: { leasePaise: true, depreciationPaise: true, otherPaise: true } })]);
    return { harvestRevenuePaise: harvests._sum.netRealisationPaise ?? 0n, idleCostPaise: (idle._sum.leasePaise ?? 0n) + (idle._sum.depreciationPaise ?? 0n) + (idle._sum.otherPaise ?? 0n) };
  }
  async businessPnl(ctx: Context) {
    const [revenue, direct] = await Promise.all([
      this.prisma.harvestEvent.aggregate({ where: { businessId: ctx.businessId, voidedAt: null }, _sum: { netRealisationPaise: true } }),
      this.prisma.expense.aggregate({ where: { businessId: ctx.businessId, voidedAt: null, ratePending: false }, _sum: { amountPaise: true } }),
    ]);
    const revenuePaise = revenue._sum.netRealisationPaise ?? 0n;
    const costPaise = direct._sum.amountPaise ?? 0n;
    return { revenuePaise, costPaise, netProfitPaise: revenuePaise - costPaise };
  }
  async insights(ctx: Context) {
    const [revenue, direct, activeCrops, openPayables, latestHarvest] = await Promise.all([
      this.prisma.harvestEvent.aggregate({ where: { businessId: ctx.businessId, voidedAt: null }, _sum: { netRealisationPaise: true } }),
      this.prisma.expense.aggregate({ where: { businessId: ctx.businessId, voidedAt: null, ratePending: false }, _sum: { amountPaise: true } }),
      this.prisma.crop.count({ where: { businessId: ctx.businessId, status: { in: ['ACTIVE', 'HARVESTING'] }, voidedAt: null } }),
      this.prisma.expense.count({ where: { businessId: ctx.businessId, paymentStatus: { in: ['UNPAID', 'PART_PAID'] }, voidedAt: null } }),
      this.prisma.harvestEvent.findFirst({ where: { businessId: ctx.businessId, voidedAt: null }, orderBy: { harvestDate: 'desc' }, select: { harvestDate: true } }),
    ]);
    const revenuePaise = revenue._sum.netRealisationPaise ?? 0n;
    const costPaise = direct._sum.amountPaise ?? 0n;
    const netProfitPaise = revenuePaise - costPaise;
    return {
      generatedAt: new Date().toISOString(),
      figures: { revenuePaise, costPaise, netProfitPaise },
      insights: [
        { kind: netProfitPaise >= 0n ? 'POSITIVE_MARGIN' : 'COSTS_AHEAD', message: netProfitPaise >= 0n ? 'Recorded revenue is ahead of recorded costs.' : 'Recorded costs are ahead of recorded revenue.', valuePaise: netProfitPaise },
        { kind: 'ACTIVE_CROPS', message: `${activeCrops} active crop${activeCrops === 1 ? '' : 's'} need daily records.`, count: activeCrops },
        { kind: 'OPEN_PAYABLES', message: openPayables ? `${openPayables} farm payment${openPayables === 1 ? '' : 's'} still need attention.` : 'No unpaid farm expenses are waiting.', count: openPayables },
        ...(latestHarvest ? [{ kind: 'LATEST_HARVEST', message: `Latest harvest recorded on ${latestHarvest.harvestDate.toISOString().slice(0, 10)}.` }] : []),
      ],
    };
  }
  async costHeadAnalysis(ctx: Context) {
    return this.prisma.expense.groupBy({ by: ['costHeadId'], where: { businessId: ctx.businessId, voidedAt: null, ratePending: false }, _sum: { amountPaise: true }, _count: { id: true } });
  }
  async assetRegister(ctx: Context) {
    return this.prisma.asset.findMany({ where: { businessId: ctx.businessId, voidedAt: null }, select: { id: true, name: true, category: true, costPaise: true, purchaseDate: true, disposalDate: true } });
  }
  async leaseRegister(ctx: Context) {
    return this.prisma.leaseAgreement.findMany({ where: { businessId: ctx.businessId, voidedAt: null }, select: { id: true, landlordName: true, extentAcres: true, ratePerAcrePerAnnumPaise: true, startDate: true, endDate: true, paymentFrequency: true } });
  }
}
