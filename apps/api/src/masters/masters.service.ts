import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../platform/prisma.service';
import { QueryScope, ScopeUser } from '../authorization/query-scope';
import type { PondListItemDto } from './masters.controller';

export type MasterContext = { businessId: string; userId: string; deviceId: string };
export type Delegate = {
  findMany(args: unknown): Promise<unknown>;
  findUnique(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

@Injectable()
export class MastersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: QueryScope,
  ) {}

  get farm(): Delegate { return this.prisma.farm; }
  get pond(): Delegate { return this.prisma.pond; }
  get leaseAgreement(): Delegate { return this.prisma.leaseAgreement; }
  get species(): Delegate { return this.prisma.species; }
  get feedItem(): Delegate { return this.prisma.feedItem; }
  get feedRateHistory(): Delegate { return this.prisma.feedRateHistory; }
  get medicineItem(): Delegate { return this.prisma.medicineItem; }
  get medicineRateHistory(): Delegate { return this.prisma.medicineRateHistory; }
  get party(): Delegate { return this.prisma.party; }
  get supplierCreditLimit(): Delegate { return this.prisma.supplierCreditLimit; }
  get labour(): Delegate { return this.prisma.labour; }
  get asset(): Delegate { return this.prisma.asset; }
  get costHead(): Delegate { return this.prisma.costHead; }
  get preparationTemplate(): Delegate { return this.prisma.preparationTemplate; }
  get marketRateReference(): Delegate { return this.prisma.marketRateReference; }

  async validateLeaseExtent(businessId: string, extentAcres: number, pondId?: string, client?: PrismaService, leaseAgreementId?: string): Promise<void> {
    if (!pondId && !leaseAgreementId) return;
    const prisma = client ?? this.prisma;
    const pond = await prisma.pond.findFirst({ where: { businessId, voidedAt: null, ...(pondId ? { id: pondId } : leaseAgreementId ? { leaseAgreementId } : { id: '__missing__' }) }, select: { extentAcres: true } });
    if (!pond) throw new BadRequestException('Attached pond was not found.');
    if (new Prisma.Decimal(String(extentAcres)).gt(pond.extentAcres)) {
      throw new BadRequestException('Lease extent cannot exceed the attached pond extent.');
    }
  }

  async listPonds(user: ScopeUser): Promise<PondListItemDto[]> {
    const ponds = await this.prisma.pond.findMany({ where: { ...this.scope.pondWhere(user), voidedAt: null } });
    return this.pondSummaries(ponds, user);
  }

  async getPond(id: string, user: ScopeUser): Promise<PondListItemDto | null> {
    const pond = await this.prisma.pond.findFirst({ where: { ...this.scope.pondWhere(user, id), voidedAt: null } });
    if (!pond) return null;
    const [summary] = await this.pondSummaries([pond], user);
    return summary ?? null;
  }

  private async pondSummaries(ponds: Array<{ id: string; businessId: string; farmId: string; code: string; name: string; extentAcres: Prisma.Decimal; status: string }>, user: ScopeUser): Promise<PondListItemDto[]> {
    const pondIds = ponds.map((pond) => pond.id);
    const crops = await this.prisma.crop.findMany({
      where: { businessId: user.businessId, pondId: { in: pondIds }, status: { in: ['ACTIVE', 'HARVESTING'] }, voidedAt: null },
      orderBy: { stockingDate: 'desc' },
    });
    const activeCrops = new Map<string, (typeof crops)[number]>();
    for (const crop of crops) if (!activeCrops.has(crop.pondId)) activeCrops.set(crop.pondId, crop);
    const cropIds = [...activeCrops.values()].map((crop) => crop.id);
    const [feeds, waters, healthEvents, growthSamples, speciesLines] = await Promise.all([
      this.prisma.feedLog.findMany({ where: { businessId: user.businessId, cropId: { in: cropIds }, voidedAt: null }, orderBy: { logDate: 'desc' } }),
      this.prisma.waterReading.findMany({ where: { businessId: user.businessId, pondId: { in: pondIds }, voidedAt: null }, orderBy: { readAt: 'desc' } }),
      this.prisma.healthEvent.findMany({ where: { businessId: user.businessId, cropId: { in: cropIds }, voidedAt: null }, orderBy: { eventDate: 'desc' } }),
      this.prisma.growthSample.findMany({ where: { businessId: user.businessId, cropId: { in: cropIds }, voidedAt: null }, orderBy: { sampledOn: 'desc' } }),
      this.prisma.cropSpeciesLine.findMany({ where: { businessId: user.businessId, cropId: { in: cropIds }, voidedAt: null } }),
    ]);
    const speciesIds = [...new Set(speciesLines.map((line) => line.speciesId))];
    const species = await this.prisma.species.findMany({ where: { id: { in: speciesIds } } });
    const latest = <T extends { cropId: string }>(rows: T[]) => new Map(rows.map((row) => [row.cropId, row]));
    const latestWater = new Map<string, (typeof waters)[number]>();
    for (const water of waters) if (!latestWater.has(water.pondId)) latestWater.set(water.pondId, water);
    const latestFeed = latest(feeds);
    const latestHealth = latest(healthEvents);
    const latestGrowth = latest(growthSamples);
    const lineByCrop = new Map(speciesLines.map((line) => [line.cropId, line]));
    const speciesById = new Map(species.map((item) => [item.id, item]));
    return Promise.all(ponds.map((pond) => this.pondSummary(
      pond,
      activeCrops.get(pond.id),
      latestFeed,
      latestWater.get(pond.id),
      latestHealth,
      latestGrowth,
      lineByCrop,
      speciesById,
    )));
  }

  private async pondSummary(
    pond: { id: string; businessId: string; farmId: string; code: string; name: string; extentAcres: Prisma.Decimal; status: string },
    crop: Awaited<ReturnType<PrismaService['crop']['findMany']>>[number] | undefined,
    feeds: Map<string, Awaited<ReturnType<PrismaService['feedLog']['findMany']>>[number]>,
    water: Awaited<ReturnType<PrismaService['waterReading']['findMany']>>[number] | undefined,
    healthEvents: Map<string, Awaited<ReturnType<PrismaService['healthEvent']['findMany']>>[number]>,
    growthSamples: Map<string, Awaited<ReturnType<PrismaService['growthSample']['findMany']>>[number]>,
    speciesLines: Map<string, Awaited<ReturnType<PrismaService['cropSpeciesLine']['findMany']>>[number]>,
    speciesById: Map<string, Awaited<ReturnType<PrismaService['species']['findMany']>>[number]>,
  ): Promise<PondListItemDto> {
    const feed = crop ? feeds.get(crop.id) : undefined;
    const health = crop ? healthEvents.get(crop.id) : undefined;
    const growth = crop ? growthSamples.get(crop.id) : undefined;
    const speciesLine = crop ? speciesLines.get(crop.id) : undefined;
    const species = speciesLine ? speciesById.get(speciesLine.speciesId) : undefined;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const signals: string[] = [];
    if (crop && (!feed || feed.logDate < today)) signals.push('FEED_NOT_LOGGED_TODAY');
    if (health && health.eventDate >= new Date(Date.now() - 7 * 86_400_000)) signals.push('RECENT_HEALTH_EVENT');
    if (crop && (!growth || growth.sampledOn < new Date(Date.now() - 7 * 86_400_000))) signals.push('GROWTH_SAMPLE_OVERDUE');
    if (crop && !water) signals.push('WATER_READING_MISSING');
    if (water && species?.waterParamRanges && typeof species.waterParamRanges === 'object') {
      const ranges = species.waterParamRanges as Record<string, { min?: number; max?: number }>;
      const readings: Record<string, Prisma.Decimal | number | null> = { ph: water.ph, doMgl: water.doMgl, salinityPpt: water.salinityPpt, temperatureC: water.temperatureC };
      if (Object.entries(readings).some(([key, value]) => {
        const range = ranges[key]; if (!range || value === null) return false;
        const number = Number(value);
        return (range.min !== undefined && number < range.min) || (range.max !== undefined && number > range.max);
      })) signals.push('WATER_OUT_OF_CONFIGURED_RANGE');
    }
    const state = signals.includes('RECENT_HEALTH_EVENT') ? 'RED' : signals.length > 0 ? 'AMBER' : 'GREEN';
    const derivation = (inputs: string[], steps: string[]) => ({ inputs, steps });
    const envelope = (value: string | null, unit: string, status: string, reason: string, inputs: string[], steps: string[]) => ({ value, unit, status, reason, derivation: derivation(inputs, steps) });
    const abw = growth ? envelope(growth.abwG.toString(), 'g', 'DETERMINED', '', ['latest growth sample'], ['use server-recorded ABW']) : envelope(null, 'g', 'NOT_DETERMINABLE', 'No growth sample has been recorded', ['growth samples'], ['latest ABW required']);
    const biomass = crop?.standingBiomassG ? envelope(crop.standingBiomassG.toString(), 'g', 'DETERMINED', '', ['crop standing biomass'], ['use server-recorded standing biomass']) : envelope(null, 'g', 'NOT_DETERMINABLE', 'Standing biomass is not available', ['crop standing biomass'], ['standing biomass required']);
    const fcr = envelope(null, 'ratio', 'NOT_DETERMINABLE', 'FCR requires feed and biomass gain inputs', ['feed logs', 'biomass history'], ['server calculation requires a biomass gain']);
    const density = crop?.estimatedSurvivors ? envelope(crop.estimatedSurvivors.toString(), 'animals', 'ESTIMATED', 'Estimated survivors', ['estimated survivors'], ['use server-estimated survivors']) : envelope(null, 'animals', 'NOT_DETERMINABLE', 'Survivor estimate is not available', ['stocking and mortality records'], ['server survivor estimate required']);
    return {
      ...pond,
      extentAcres: pond.extentAcres.toString(),
      attention: { state, reason: signals.length ? signals.join(', ') : 'All daily checks are up to date', signals },
      activeCrop: crop ? {
        id: crop.id, code: crop.code, status: crop.status,
        doc: envelope(String(Math.max(0, Math.floor((Date.now() - crop.stockingDate.getTime()) / 86_400_000))), 'days', 'ESTIMATED', 'Calculated from stocking date', ['stocking date', 'server date'], ['server date minus stocking date']),
        abw, biomass, fcr, density,
      } : null,
    };
  }

  list(delegate: Delegate, user: ScopeUser, pond = false, financial = false, includeSystemRows = false): Promise<unknown> {
    if (financial) this.scope.assertFinancial(user);
    const where = pond
      ? this.scope.pondWhere(user)
      : includeSystemRows
        ? { OR: [{ businessId: user.businessId }, { businessId: null }], voidedAt: null }
        : { businessId: user.businessId, voidedAt: null };
    return delegate.findMany({
      where,
    });
  }

  get(delegate: Delegate, id: string, user: ScopeUser, pond = false, financial = false, includeSystemRows = false): Promise<unknown> {
    if (financial) this.scope.assertFinancial(user);
    const where = pond
      ? this.scope.pondWhere(user, id)
      : includeSystemRows
        ? { id, OR: [{ businessId: user.businessId }, { businessId: null }] }
        : { id, businessId: user.businessId };
    return delegate.findUnique({
      where,
    });
  }

  async create(delegate: Delegate, data: object, context: MasterContext): Promise<unknown> {
    const after = await delegate.create({
      data: {
        ...data,
        businessId: context.businessId,
        createdBy: context.userId,
        updatedBy: context.userId,
        deviceId: context.deviceId,
      },
    });
    await this.audit(context, (after as { id: string }).id, 'CREATE', Prisma.JsonNull, after);
    return after;
  }

  async createLease(data: Record<string, unknown>, context: MasterContext): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const pondId = data.pondId as string | undefined;
      const leaseData = { ...data };
      delete leaseData.pondId;
      await this.validateLeaseExtent(context.businessId, Number(leaseData.extentAcres), pondId, tx as unknown as PrismaService);
      const lease = await tx.leaseAgreement.create({
        data: { ...leaseData, businessId: context.businessId, createdBy: context.userId, updatedBy: context.userId, deviceId: context.deviceId } as Prisma.LeaseAgreementUncheckedCreateInput,
      });
      if (pondId) await tx.pond.update({ where: { id: pondId }, data: { leaseAgreementId: lease.id, ownershipType: 'LEASED', updatedBy: context.userId } });
      const start = new Date(data.startDate as Date);
      const end = new Date(data.endDate as Date);
      const frequency = String(data.paymentFrequency).toUpperCase();
      if (frequency === 'CUSTOM') {
        const rows = (data.customSchedule as Array<{ dueDate: string; amountPaise: string }> | undefined) ?? [];
        await tx.leasePaymentSchedule.createMany({
          data: rows.map((row) => ({
            businessId: context.businessId, leaseAgreementId: lease.id, dueDate: new Date(row.dueDate),
            amountPaise: BigInt(row.amountPaise), status: 'DUE', createdBy: context.userId,
            updatedBy: context.userId, deviceId: context.deviceId,
          })),
        });
        return lease;
      }
      const months = frequency === 'HALF_YEARLY' ? 6 : 12;
      const periods: Date[] = [];
      for (const due = new Date(start); due <= end; due.setMonth(due.getMonth() + months)) periods.push(new Date(due));
      // Escalation is retained for audit/history; v1 schedule generation does not apply it.
      const annual = new Prisma.Decimal(String(data.ratePerAcrePerAnnumPaise)).mul(String(data.extentAcres));
      const amount = BigInt(annual.div(Math.max(1, 12 / months)).toFixed(0));
      await tx.leasePaymentSchedule.createMany({
        data: periods.map((dueDate) => ({
          businessId: context.businessId, leaseAgreementId: lease.id, dueDate, amountPaise: amount,
          status: 'DUE', createdBy: context.userId, updatedBy: context.userId, deviceId: context.deviceId,
        })),
      });
      await tx.auditLog.create({
        data: { businessId: context.businessId, entity: 'leaseAgreement', entityId: lease.id, action: 'CREATE',
          userId: context.userId, deviceId: context.deviceId, at: new Date(), before: Prisma.JsonNull,
          after: lease as never, createdBy: context.userId, updatedBy: context.userId },
      });
      return lease;
    });
  }

  async updateLease(id: string, data: Record<string, unknown>, context: MasterContext): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.leaseAgreement.findFirst({ where: { id, businessId: context.businessId, voidedAt: null }, select: { extentAcres: true } });
      if (!existing) throw new BadRequestException('Lease agreement was not found.');
      const pondId = data.pondId as string | undefined;
      const leaseData = { ...data };
      delete leaseData.pondId;
      await this.validateLeaseExtent(context.businessId, Number(leaseData.extentAcres), pondId, tx as unknown as PrismaService, id);
      const lease = await tx.leaseAgreement.update({
        where: { id },
        data: { ...leaseData, updatedBy: context.userId },
      });
      if (pondId) await tx.pond.update({ where: { id: pondId }, data: { leaseAgreementId: id, ownershipType: 'LEASED', updatedBy: context.userId } });
      return lease;
    });
  }

  async update(delegate: Delegate, id: string, data: object, context: MasterContext): Promise<unknown> {
    const before = await delegate.findUnique({ where: { id, businessId: context.businessId } });
    const after = await delegate.update({
      where: { id, businessId: context.businessId },
      data: { ...data, updatedBy: context.userId },
    });
    await this.audit(context, id, 'UPDATE', before, after);
    return after;
  }

  private audit(context: MasterContext, entityId: string, action: string, before: unknown, after: unknown): Promise<unknown> {
    return this.prisma.auditLog.create({
      data: {
        businessId: context.businessId,
        entity: 'master',
        entityId,
        action,
        userId: context.userId,
        deviceId: context.deviceId,
        at: new Date(),
        before: before as never,
        after: after as never,
        createdBy: context.userId,
        updatedBy: context.userId,
      },
    });
  }
}
