import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, CropStatus, PondStatus } from '@prisma/client';
import { PrismaService } from '../platform/prisma.service';

type BatchInput = {
  speciesId: string;
  stockedOn: string;
  quantityPieces: string;
  ratePaise: string;
  seedCostPaise?: string;
  transportCostPaise?: string;
  plStage?: string;
};

type Context = { businessId: string; userId: string; deviceId: string };

@Injectable()
export class CropService {
  constructor(private readonly prisma: PrismaService) {}

  async preparations(pondId: string, businessId: string) {
    return this.prisma.preparationActivity.findMany({ where: { pondId, businessId, voidedAt: null, cropId: null } });
  }

  async createPreparation(pondId: string, body: { name: string; startDate: string; labourCostPaise: string; materialCostPaise: string; amountPaise: string; remarks?: string }, ctx: Context) {
    return this.prisma.preparationActivity.create({
      data: {
        businessId: ctx.businessId, pondId, cropId: null, name: body.name, startDate: new Date(body.startDate),
        labourCostPaise: BigInt(body.labourCostPaise), materialCostPaise: BigInt(body.materialCostPaise),
        amountPaise: BigInt(body.amountPaise), remarks: body.remarks, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId,
      },
    });
  }

  async updateStockingDate(cropId: string, stockingDate: string, reason: string, ctx: Context) {
    if (!reason.trim()) throw new BadRequestException('A reason is required');
    const crop = await this.prisma.crop.findFirst({ where: { id: cropId, businessId: ctx.businessId, voidedAt: null } });
    if (!crop) throw new NotFoundException('Crop not found');
    const line = await this.prisma.cropSpeciesLine.findFirst({ where: { cropId } });
    const species = line ? await this.prisma.species.findUnique({ where: { id: line.speciesId } }) : null;
    const date = new Date(stockingDate);
    const expected = species?.defaultDocDays ? new Date(date.getTime() + species.defaultDocDays * 86400000) : null;
    return this.prisma.crop.update({ where: { id: cropId }, data: { stockingDate: date, expectedHarvestDate: expected, updatedBy: ctx.userId } });
  }

  async readiness(pondId: string, speciesId: string) {
    const [species, reading] = await Promise.all([
      this.prisma.species.findUnique({ where: { id: speciesId } }),
      this.prisma.waterReading.findFirst({ where: { pondId }, orderBy: { readAt: 'desc' } }),
    ]);
    if (!species) throw new NotFoundException('Species not found');
    const ranges = (species.waterParamRanges ?? {}) as Record<string, { min: number; max: number; unit: string }>;
    const outOfRange = Object.entries(ranges).flatMap(([parameter, range]) => {
      const value = reading?.[parameter as keyof typeof reading];
      if (value === null || value === undefined) return [];
      const numeric = Number(value);
      return numeric < range.min || numeric > range.max
        ? [{ parameter, value: numeric, min: range.min, max: range.max }]
        : [];
    });
    return { ready: outOfRange.length === 0, outOfRange };
  }

  async stock(pondId: string, input: { speciesCategory: string; batches: BatchInput[] }, ctx: Context) {
    if (input.batches.length === 0) throw new BadRequestException('At least one stocking batch is required');
    return this.prisma.$transaction(async (tx) => {
      const pond = await tx.pond.findFirst({ where: { id: pondId, businessId: ctx.businessId, voidedAt: null } });
      if (!pond) throw new NotFoundException('Pond not found');
      const active = await tx.crop.findFirst({ where: { pondId, status: { in: [CropStatus.ACTIVE, CropStatus.HARVESTING] }, voidedAt: null } });
      if (active) throw new BadRequestException('Pond already has an active crop');
      const sorted = [...input.batches].sort((a, b) => a.stockedOn.localeCompare(b.stockedOn));
      const firstDate = new Date(sorted[0]!.stockedOn);
      const totalQty = sorted.reduce((sum, batch) => sum + Number(batch.quantityPieces), 0);
      const weighted = new Date(sorted.reduce((sum, batch) => sum + new Date(batch.stockedOn).getTime() * Number(batch.quantityPieces), 0) / totalQty);
      const latest = await tx.waterReading.findFirst({ where: { pondId }, orderBy: { readAt: 'desc' } });
      const speciesIds = [...new Set(input.batches.map((batch) => batch.speciesId))];
      const ranges = await tx.species.findMany({ where: { id: { in: speciesIds } } });
      const outOfRange = ranges.flatMap((species) => this.outOfRange(latest, species.waterParamRanges));
      const crop = await tx.crop.create({
        data: {
          businessId: ctx.businessId,
          pondId,
          code: `CROP-${Date.now()}`,
          speciesCategory: input.speciesCategory,
          status: CropStatus.ACTIVE,
          preparationStartDate: firstDate,
          stockingDate: firstDate,
          weightedStockingDate: weighted,
          survivalAssumptionPct: new Prisma.Decimal(0),
          feedLoggingEnabled: true,
          stockingFlags: {
            waterNotReadyAtStocking: outOfRange.length > 0,
            outOfRangeParameters: outOfRange,
            readinessCheckedAt: latest?.readAt.toISOString() ?? null,
          } as Prisma.InputJsonValue,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
          deviceId: ctx.deviceId,
        },
      });
      await tx.cropSpeciesLine.createMany({
        data: speciesIds.map((speciesId) => ({ businessId: ctx.businessId, cropId: crop.id, speciesId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId })),
      });
      await tx.stockingBatch.createMany({
        data: input.batches.map((batch) => ({
          businessId: ctx.businessId,
          cropId: crop.id,
          speciesId: batch.speciesId,
          stockedOn: new Date(batch.stockedOn),
          quantityPieces: new Prisma.Decimal(batch.quantityPieces),
          rateBasis: 'PER_PIECE',
          ratePaise: BigInt(batch.ratePaise),
          seedCostPaise: BigInt(batch.seedCostPaise ?? '0'),
          transportCostPaise: BigInt(batch.transportCostPaise ?? '0'),
          plStage: batch.plStage,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
          deviceId: ctx.deviceId,
        })),
      });
      await tx.preparationActivity.updateMany({
        where: { pondId, businessId: ctx.businessId, cropId: null, voidedAt: null },
        data: { cropId: crop.id, updatedBy: ctx.userId, deviceId: ctx.deviceId },
      });
      const prep = await tx.preparationActivity.aggregate({ where: { cropId: crop.id }, _min: { startDate: true } });
      const updated = await tx.crop.update({ where: { id: crop.id }, data: { preparationStartDate: prep._min.startDate ?? firstDate } });
      await tx.pond.update({ where: { id: pondId }, data: { status: PondStatus.STOCKED, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      return updated;
    });
  }

  private outOfRange(reading: Record<string, unknown> | null, raw: Prisma.JsonValue | null): Array<Record<string, unknown>> {
    if (!reading || !raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    return Object.entries(raw as Record<string, { min: number; max: number }>).flatMap(([parameter, range]) => {
      const value = reading[parameter];
      if (value === null || value === undefined) return [];
      const numeric = Number(value);
      return numeric < range.min || numeric > range.max ? [{ parameter, value: numeric, min: range.min, max: range.max }] : [];
    });
  }
}
