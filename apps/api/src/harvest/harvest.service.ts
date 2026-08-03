import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { abwPlausibility, animalsHarvested, bp, harvestAbw, massMg, partialHarvestSurvivors, weightG } from '../rules-engine';
import { PrismaService } from '../platform/prisma.service';
import { AllocationService } from '../allocation/allocation.service';

type Context = { businessId: string; userId: string; deviceId: string };
type Line = { speciesId?: string; basis: 'COUNT' | 'GRADE'; key: string; quantityKg: string; ratePerKgPaise: string };
type HarvestInput = { harvestDate: string; doc: number; type: 'PARTIAL' | 'FINAL'; reason: 'TARGET_SIZE' | 'MARKET_RATE' | 'DISEASE' | 'SEASON_END' | 'OTHER'; sampleTaken: boolean; sampleCount?: number; sampleWeightG?: string; buyerPartyId?: string; receivableDueDate?: string; lines: Line[]; deductions?: Array<{ kind: string; amountPaise: string }> };

@Injectable()
export class HarvestService {
  constructor(private readonly prisma: PrismaService, private readonly allocations?: AllocationService) {}

  async harvest(cropId: string, body: HarvestInput, ctx: Context) {
    if (!body.lines.length) throw new BadRequestException('Harvest lines are required');
    if (new Set(body.lines.map((line) => line.ratePerKgPaise)).size > 1) throw new BadRequestException('A harvest uses one dated rate card; blended rates are not allowed');
    if (body.sampleTaken && (!body.sampleCount || !body.sampleWeightG)) throw new BadRequestException('Sample count and weight are required');
    if (!body.sampleTaken && (body.sampleCount !== undefined || body.sampleWeightG !== undefined)) throw new BadRequestException('Do not provide sample values when sample was not taken');
    return this.prisma.$transaction(async (tx) => {
      const crop = await tx.crop.findFirst({ where: { id: cropId, businessId: ctx.businessId, voidedAt: null } });
      if (!crop) throw new NotFoundException('Crop not found');
      if (crop.status === 'CLOSED') throw new BadRequestException('Closed crops are read-only');
      const previous = await tx.growthSample.findFirst({ where: { cropId, voidedAt: null }, orderBy: { sampledOn: 'desc' } });
      const sampleWeightMg = body.sampleTaken ? BigInt(Math.round(Number(body.sampleWeightG) * 1000)) : 0n;
      const sampleAbw = harvestAbw(body.sampleTaken, massMg(sampleWeightMg), BigInt(body.sampleCount ?? 0));
      const plausible = previous && sampleAbw.value !== null ? abwPlausibility(massMg(BigInt(Math.round(Number(previous.abwG) * 1000))), sampleAbw.value, bp(5_000n)) : null;
      if (plausible && plausible.value === false) throw new BadRequestException('Harvest ABW is implausible against the last growth sample');
      const gross = body.lines.reduce((sum, line) => sum + BigInt(Math.round(Number(line.quantityKg) * Number(line.ratePerKgPaise))), 0n);
      const deductions = (body.deductions ?? []).reduce((sum, item) => sum + BigInt(item.amountPaise), 0n);
      const event = await tx.harvestEvent.create({ data: { businessId: ctx.businessId, cropId, harvestDate: new Date(body.harvestDate), doc: body.doc, type: body.type, reason: body.reason, buyerPartyId: body.buyerPartyId, sampleTaken: body.sampleTaken, sampleCount: body.sampleTaken ? body.sampleCount : null, sampleWeightG: body.sampleTaken ? new Prisma.Decimal(body.sampleWeightG!) : null, abwG: sampleAbw.value === null ? null : new Prisma.Decimal(Number(sampleAbw.value) / 1000), rateCardId: null, grossValuePaise: gross, deductionsPaise: deductions, netRealisationPaise: gross - deductions, receivablePaise: gross - deductions, receivableDueDate: body.receivableDueDate ? new Date(body.receivableDueDate) : null, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      await tx.harvestLine.createMany({ data: body.lines.map((line) => ({ businessId: ctx.businessId, harvestEventId: event.id, speciesId: line.speciesId, basis: line.basis, key: line.key, quantityKg: new Prisma.Decimal(line.quantityKg), ratePerKgPaise: BigInt(line.ratePerKgPaise), lineValuePaise: BigInt(Math.round(Number(line.quantityKg) * Number(line.ratePerKgPaise))), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId })) });
      if (body.deductions?.length) await tx.harvestDeduction.createMany({ data: body.deductions.map((item) => ({ businessId: ctx.businessId, harvestEventId: event.id, kind: item.kind, amountPaise: BigInt(item.amountPaise), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId })) });
      if (body.type === 'PARTIAL') {
        const harvestedWeightG = body.lines.reduce((sum, line) => sum + Number(line.quantityKg) * 1000, 0);
        const harvestedAnimals = sampleAbw.value === null ? 0n : (animalsHarvested(weightG(BigInt(Math.round(harvestedWeightG))), sampleAbw.value).value ?? 0n);
        const reduced = partialHarvestSurvivors(crop.estimatedSurvivors ?? 0n, harvestedAnimals).value ?? 0n;
        await tx.crop.update({ where: { id: cropId }, data: { estimatedSurvivors: reduced < 0n ? 0n : reduced, standingBiomassG: crop.standingBiomassG === null ? undefined : new Prisma.Decimal(Math.max(0, Number(crop.standingBiomassG) - harvestedWeightG)) } });
      }
      await tx.crop.update({ where: { id: cropId }, data: { status: body.type === 'FINAL' ? 'CLOSED' : 'HARVESTING', finalHarvestDate: body.type === 'FINAL' ? new Date(body.harvestDate) : undefined, closedAt: body.type === 'FINAL' ? new Date() : undefined, closedBy: body.type === 'FINAL' ? ctx.userId : undefined } });
      if (body.type === 'FINAL') await tx.pond.update({ where: { id: crop.pondId }, data: { status: 'IDLE', updatedBy: ctx.userId } });
      return { ...event, survival: sampleAbw.value === null ? { value: null, status: 'NOT_DETERMINABLE' } : { value: null, status: 'ACTUAL' }, plausibility: plausible };
    });
  }

  async close(cropId: string, ctx: Context) {
    return this.prisma.$transaction(async (tx) => {
      const crop = await tx.crop.findFirst({ where: { id: cropId, businessId: ctx.businessId, voidedAt: null } });
      if (!crop) throw new NotFoundException('Crop not found');
      const checklist = await tx.cropClosureChecklist.findMany({ where: { cropId, businessId: ctx.businessId, voidedAt: null } });
      const required = ['CONFIRM_HARVESTS', 'ZERO_COST_HEADS', 'RECONCILE_FEED_STOCK', 'POST_OCCUPANCY_COSTS', 'CLOSURE_ALLOCATION'];
      if (required.some((step) => checklist.find((item) => item.step === step)?.status !== 'COMPLETED')) throw new BadRequestException('Closure checklist is incomplete');
      const previous = await tx.cropPnl.findFirst({ where: { cropId, isCurrent: true }, orderBy: { version: 'desc' } });
      if (previous) await tx.cropPnl.update({ where: { id: previous.id }, data: { isCurrent: false } });
      const version = (previous?.version ?? 0) + 1;
      const pnl = await tx.cropPnl.create({ data: { businessId: ctx.businessId, cropId, version, generatedAt: new Date(), generatedBy: ctx.userId, payload: { status: 'FROZEN', source: 'closure' }, isCurrent: true, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      await tx.crop.update({ where: { id: cropId }, data: { status: 'CLOSED', closedAt: new Date(), closedBy: ctx.userId } });
      await tx.pond.update({ where: { id: crop.pondId }, data: { status: 'IDLE', updatedBy: ctx.userId } });
      return pnl;
    });
  }

  async checklist(cropId: string, ctx: Context) {
    const crop = await this.prisma.crop.findFirst({ where: { id: cropId, businessId: ctx.businessId, voidedAt: null } });
    if (!crop) throw new NotFoundException('Crop not found');
    const steps = ['CONFIRM_HARVESTS', 'ZERO_COST_HEADS', 'RECONCILE_FEED_STOCK', 'POST_OCCUPANCY_COSTS', 'CLOSURE_ALLOCATION', 'FREEZE_PNL'];
    return this.prisma.$transaction(async (tx) => {
      for (const step of steps) {
        const existing = await tx.cropClosureChecklist.findFirst({ where: { businessId: ctx.businessId, cropId, step, voidedAt: null } });
        if (existing) await tx.cropClosureChecklist.update({ where: { id: existing.id }, data: { status: 'PENDING', updatedBy: ctx.userId } });
        else await tx.cropClosureChecklist.create({ data: { businessId: ctx.businessId, cropId, step, status: 'PENDING', createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      }
      return tx.cropClosureChecklist.findMany({ where: { cropId, businessId: ctx.businessId }, orderBy: { step: 'asc' } });
    });
  }

  async executeStep(cropId: string, step: string, note: string | undefined, ctx: Context) {
    const valid = ['CONFIRM_HARVESTS', 'ZERO_COST_HEADS', 'RECONCILE_FEED_STOCK', 'POST_OCCUPANCY_COSTS', 'CLOSURE_ALLOCATION'];
    if (!valid.includes(step)) throw new BadRequestException('Unknown closure step');
    const crop = await this.prisma.crop.findFirst({ where: { id: cropId, businessId: ctx.businessId, voidedAt: null } });
    if (!crop) throw new NotFoundException('Crop not found');
    if (step === 'CONFIRM_HARVESTS') {
      const count = await this.prisma.harvestEvent.count({ where: { cropId, businessId: ctx.businessId, voidedAt: null } });
      if (!count) throw new BadRequestException('At least one harvest is required');
    }
    if (step === 'RECONCILE_FEED_STOCK' && note !== 'CARRY_FORWARD' && !note?.startsWith('WRITE_OFF:')) throw new BadRequestException('Choose CARRY_FORWARD or WRITE_OFF:<reason>');
    if (step === 'POST_OCCUPANCY_COSTS' || step === 'CLOSURE_ALLOCATION') {
      if (!this.allocations) throw new BadRequestException('Allocation service unavailable');
      await this.allocations.run({ periodStart: crop.preparationStartDate.toISOString(), periodEnd: (crop.finalHarvestDate ?? new Date()).toISOString(), trigger: 'CLOSURE' }, ctx);
    }
    return this.prisma.cropClosureChecklist.updateMany({ where: { cropId, businessId: ctx.businessId, step }, data: { status: 'COMPLETED', note, updatedBy: ctx.userId } });
  }

  async reopen(cropId: string, reason: string, ctx: Context) {
    if (!reason.trim()) throw new BadRequestException('A reason is required');
    return this.prisma.$transaction(async (tx) => {
      const crop = await tx.crop.findFirst({ where: { id: cropId, businessId: ctx.businessId, voidedAt: null } });
      if (!crop) throw new NotFoundException('Crop not found');
      const current = await tx.cropPnl.findFirst({ where: { cropId, isCurrent: true }, orderBy: { version: 'desc' } });
      if (current) await tx.cropPnl.update({ where: { id: current.id }, data: { isCurrent: false } });
      const pnl = await tx.cropPnl.create({ data: { businessId: ctx.businessId, cropId, version: (current?.version ?? 0) + 1, generatedAt: new Date(), generatedBy: ctx.userId, payload: { status: 'REOPENED', reason }, isCurrent: true, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      await tx.crop.update({ where: { id: cropId }, data: { status: 'HARVESTING', closedAt: null, closedBy: null, reopenedCount: { increment: 1 }, updatedBy: ctx.userId } });
      await tx.auditLog.create({ data: { businessId: ctx.businessId, entity: 'Crop', entityId: cropId, action: 'REOPEN', userId: ctx.userId, deviceId: ctx.deviceId, at: new Date(), before: { status: 'CLOSED' }, after: { status: 'HARVESTING', pnlVersion: pnl.version }, reason, createdBy: ctx.userId, updatedBy: ctx.userId } });
      return pnl;
    });
  }
}
