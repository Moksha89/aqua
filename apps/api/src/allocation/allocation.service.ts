import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../platform/prisma.service';
type Context = { businessId: string; userId: string; deviceId: string };
@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}
  async run(body: { periodStart: string; periodEnd: string; trigger?: 'MONTH_END' | 'CLOSURE' }, ctx: Context) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.allocationRun.create({ data: { businessId: ctx.businessId, periodStart: new Date(body.periodStart), periodEnd: new Date(body.periodEnd), trigger: body.trigger ?? 'MONTH_END', status: 'OPEN', createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      const crops = await tx.crop.findMany({ where: { businessId: ctx.businessId, voidedAt: null, preparationStartDate: { lte: new Date(body.periodEnd) } } });
      for (const crop of crops) {
        await tx.apportionedCost.create({ data: { businessId: ctx.businessId, cropId: crop.id, allocationRunId: run.id, kind: 'LEASE', costHeadId: '00000000-0000-0000-0000-000000000000', amountPaise: 0n, fromDate: crop.preparationStartDate, toDate: new Date(body.periodEnd), days: 0, derivation: { status: 'NOT_DETERMINABLE', reason: 'No schedule configured' }, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
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
