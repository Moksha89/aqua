import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../platform/prisma.service';
import { acres1e4, bp, commonAllocation, depreciationForWindow, days, leaseCost, paise } from '../rules-engine';
type Context = { businessId: string; userId: string; deviceId: string };
@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}
  async run(body: { periodStart: string; periodEnd: string; trigger?: 'MONTH_END' | 'CLOSURE' }, ctx: Context) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.allocationRun.create({ data: { businessId: ctx.businessId, periodStart: new Date(body.periodStart), periodEnd: new Date(body.periodEnd), trigger: body.trigger ?? 'MONTH_END', status: 'OPEN', createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      const periodEnd = new Date(body.periodEnd);
      const periodStart = new Date(body.periodStart);
      const crops = await tx.crop.findMany({ where: { businessId: ctx.businessId, voidedAt: null, preparationStartDate: { lte: periodEnd } } });
      const ponds = await tx.pond.findMany({ where: { businessId: ctx.businessId, voidedAt: null } });
      const assets = await tx.asset.findMany({ where: { businessId: ctx.businessId, voidedAt: null } });
      const pools = await tx.commonExpensePool.findMany({ where: { businessId: ctx.businessId, status: 'OPEN', voidedAt: null, periodMonth: { lte: periodEnd } } });
      const totalExtent = ponds.reduce((sum, pond) => sum + BigInt(Math.round(Number(pond.extentAcres) * 10_000)), 0n);
      const json = (value: { toJSON: () => unknown }): Prisma.InputJsonValue =>
        JSON.parse(JSON.stringify(value.toJSON())) as Prisma.InputJsonValue;
      for (const crop of crops) {
        const pond = ponds.find((item) => item.id === crop.pondId);
        if (!pond) continue;
        const from = crop.preparationStartDate > periodStart ? crop.preparationStartDate : periodStart;
        const to = crop.finalHarvestDate && crop.finalHarvestDate < periodEnd ? crop.finalHarvestDate : periodEnd;
        const occupancy = to >= from ? days(from, to) : 0n;
        if (pond.leaseAgreementId && occupancy > 0n) {
          const lease = await tx.leaseAgreement.findFirst({ where: { id: pond.leaseAgreementId, businessId: ctx.businessId, voidedAt: null } });
          if (lease) {
            const result = leaseCost(paise(lease.ratePerAcrePerAnnumPaise), acres1e4(BigInt(Math.round(Number(pond.extentAcres) * 10_000))), occupancy);
            await tx.apportionedCost.create({ data: { businessId: ctx.businessId, cropId: crop.id, allocationRunId: run.id, kind: 'LEASE', costHeadId: lease.id, amountPaise: result.value ?? 0n, fromDate: from, toDate: to, days: Number(occupancy), derivation: json(result), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
          }
        }
        for (const asset of assets.filter((item) => item.pondId === pond.id || item.pondId === null)) {
          const result = depreciationForWindow({ costPaise: paise(asset.costPaise), salvagePct: bp(BigInt(Math.round(Number(asset.salvagePct) * 100))), usefulLifeYears: BigInt(Math.round(Number(asset.usefulLifeYears))), purchaseDate: asset.purchaseDate, disposalDate: asset.disposalDate ?? undefined }, from, to);
          await tx.apportionedCost.create({ data: { businessId: ctx.businessId, cropId: crop.id, allocationRunId: run.id, kind: 'DEPRECIATION', costHeadId: asset.id, amountPaise: result.value ?? 0n, fromDate: from, toDate: to, days: Number(occupancy), derivation: json(result), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
        }
        for (const pool of pools) {
          const result = commonAllocation({ commonCostPaise: paise(pool.amountPaise), basisValue: BigInt(Math.round(Number(pond.extentAcres) * 10_000)), totalBasisValue: totalExtent, activeDays: occupancy, daysInPeriod: days(periodStart, periodEnd) });
          if (result.value !== null) await tx.apportionedCost.create({ data: { businessId: ctx.businessId, cropId: crop.id, allocationRunId: run.id, kind: 'COMMON', costHeadId: pool.costHeadId, amountPaise: result.value, fromDate: from, toDate: to, days: Number(occupancy), derivation: json(result), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
        }
      }
      return tx.allocationRun.update({ where: { id: run.id }, data: { status: 'ALLOCATED', executedAt: new Date(), executedBy: ctx.userId, updatedBy: ctx.userId } });
    });
  }
  async idle(body: { pondId: string; fromDate: string; toDate: string }, ctx: Context) {
    const pond = await this.prisma.pond.findFirst({ where: { id: body.pondId, businessId: ctx.businessId, voidedAt: null } });
    if (!pond) throw new NotFoundException('Pond not found');
    const days = Math.max(0, Math.ceil((new Date(body.toDate).getTime() - new Date(body.fromDate).getTime()) / 86_400_000));
    return this.prisma.idlePondCost.create({ data: { businessId: ctx.businessId, pondId: pond.id, fromDate: new Date(body.fromDate), toDate: new Date(body.toDate), days, leasePaise: 0n, depreciationPaise: 0n, otherPaise: 0n, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }
}
