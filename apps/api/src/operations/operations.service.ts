import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { abw, massMg } from '../rules-engine';
import { PrismaService } from '../platform/prisma.service';
import { QueryScope, ScopeUser } from '../authorization/query-scope';

type Context = ScopeUser & { deviceId: string };
type WaterInput = { cropId?: string; readAt: string; slot: string; source: string; salinityPpt?: string; ph?: string; alkalinity?: string; hardness?: string; doMgl?: string; temperatureC?: string; ammonia?: string; nitrite?: string; transparencyCm?: string };
type MedicineInput = { appliedOn: string; medicineItemId: string; quantity: string; unit: string; method: string; reason: string; costPaise: string };
type HealthInput = { eventDate: string; doc: number; symptoms: string[]; mortalityCount?: number; labTested: boolean };
type AttendanceInput = { labourId: string; pondId?: string; cropId?: string; workDate: string; days: string; amountPaise: string };

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService, private readonly scope: QueryScope) {}

  private async crop(cropId: string, businessId: string) {
    const crop = await this.prisma.crop.findFirst({ where: { id: cropId, businessId, voidedAt: null } });
    if (!crop) throw new NotFoundException('Crop not found');
    return crop;
  }

  private async writableCrop(cropId: string, ctx: Context) {
    const crop = await this.crop(cropId, ctx.businessId);
    if (crop.status === 'CLOSED') throw new BadRequestException('Closed crops are read-only');
    this.scope.assertPondScope(ctx, crop.pondId);
    return crop;
  }

  async feed(cropId: string, body: { logDate: string; mealSlot: string; feedItemId: string; quantityKg: string; bags?: number; looseKg?: string; remarks?: string }, ctx: Context) {
    const crop = await this.writableCrop(cropId, ctx);
    if (!crop.feedLoggingEnabled) throw new BadRequestException('Feed logging is disabled for this crop');
    const history = await this.prisma.feedRateHistory.findFirst({ where: { feedItemId: body.feedItemId, effectiveFrom: { lte: new Date(body.logDate) } }, orderBy: { effectiveFrom: 'desc' } });
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.feedLog.create({
        data: {
          businessId: ctx.businessId, cropId, logDate: new Date(body.logDate), mealSlot: body.mealSlot,
          feedItemId: body.feedItemId, quantityKg: new Prisma.Decimal(body.quantityKg), bags: body.bags,
          looseKg: body.looseKg ? new Prisma.Decimal(body.looseKg) : undefined,
          appliedRatePaise: history?.ratePerKgPaise, remarks: body.remarks,
          createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId,
        },
      });
      const balance = await tx.cropInputBalance.findFirst({ where: { cropId, itemId: body.feedItemId, itemType: 'FEED', voidedAt: null } });
      const quantity = new Prisma.Decimal(body.quantityKg);
      if (balance) {
        await tx.cropInputBalance.update({ where: { id: balance.id }, data: { qtyConsumed: { increment: quantity }, qtyOnHand: { decrement: quantity }, updatedBy: ctx.userId } });
      }
      return log;
    });
  }

  async feedBulk(cropId: string, rows: Array<{ logDate: string; mealSlot: string; feedItemId: string; quantityKg: string }>, ctx: Context) {
    const results = [];
    for (const row of rows) results.push(await this.feed(cropId, row, ctx));
    return results;
  }

  async feedSameAsYesterday(cropId: string, date: string, ctx: Context) {
    const previous = await this.prisma.feedLog.findMany({ where: { cropId, businessId: ctx.businessId, logDate: new Date(new Date(date).getTime() - 86_400_000), voidedAt: null } });
    return this.feedBulk(cropId, previous.map((row) => ({ logDate: date, mealSlot: row.mealSlot, feedItemId: row.feedItemId, quantityKg: row.quantityKg.toString() })), ctx);
  }

  async checkTray(cropId: string, body: { trayCode: string; position?: string; feedPlacedKg: string; checkIntervalMin: number }, ctx: Context) {
    await this.writableCrop(cropId, ctx);
    return this.prisma.checkTray.create({ data: { businessId: ctx.businessId, cropId, trayCode: body.trayCode, position: body.position, feedPlacedKg: new Prisma.Decimal(body.feedPlacedKg), checkIntervalMin: body.checkIntervalMin, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async checkTrayReading(cropId: string, body: { checkTrayId: string; readAt: string; feedPlacedKg: string; residualCode: string; residualWeightG?: string }, ctx: Context) {
    await this.writableCrop(cropId, ctx);
    const verdict = body.residualCode.toUpperCase() === 'NONE' ? 'UNDERFEEDING' : body.residualCode.toUpperCase() === 'HEAVY' ? 'OVERFEEDING' : 'OPTIMAL';
    return this.prisma.checkTrayReading.create({ data: { businessId: ctx.businessId, cropId, checkTrayId: body.checkTrayId, readAt: new Date(body.readAt), feedPlacedKg: new Prisma.Decimal(body.feedPlacedKg), residualCode: body.residualCode, residualWeightG: body.residualWeightG ? new Prisma.Decimal(body.residualWeightG) : undefined, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId, } }).then((reading) => ({ ...reading, verdict }));
  }

  async growth(cropId: string, body: { sampledOn: string; doc: number; animalsInSample: number; sampleWeightG: string; speciesId?: string; healthNotes?: string }, ctx: Context) {
    await this.writableCrop(cropId, ctx);
    const result = abw(massMg(BigInt(Math.round(Number(body.sampleWeightG) * 1000))), BigInt(body.animalsInSample));
    return this.prisma.growthSample.create({ data: { businessId: ctx.businessId, cropId, speciesId: body.speciesId, sampledOn: new Date(body.sampledOn), doc: body.doc, animalsInSample: body.animalsInSample, sampleWeightG: new Prisma.Decimal(body.sampleWeightG), individualWeightsG: [], abwG: new Prisma.Decimal(Number(result.value ?? 0) / 1000), healthNotes: body.healthNotes, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async water(pondId: string, body: WaterInput, ctx: Context) {
    this.scope.assertPondScope(ctx, pondId);
    if (body.cropId) await this.writableCrop(body.cropId, ctx);
    return this.prisma.waterReading.create({ data: { businessId: ctx.businessId, pondId, cropId: body.cropId, readAt: new Date(body.readAt), slot: body.slot, source: body.source, salinityPpt: body.salinityPpt ? new Prisma.Decimal(body.salinityPpt) : undefined, ph: body.ph ? new Prisma.Decimal(body.ph) : undefined, alkalinity: body.alkalinity ? new Prisma.Decimal(body.alkalinity) : undefined, hardness: body.hardness ? new Prisma.Decimal(body.hardness) : undefined, doMgl: body.doMgl ? new Prisma.Decimal(body.doMgl) : undefined, temperatureC: body.temperatureC ? new Prisma.Decimal(body.temperatureC) : undefined, ammonia: body.ammonia ? new Prisma.Decimal(body.ammonia) : undefined, nitrite: body.nitrite ? new Prisma.Decimal(body.nitrite) : undefined, transparencyCm: body.transparencyCm ? new Prisma.Decimal(body.transparencyCm) : undefined, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async medicine(cropId: string, body: MedicineInput, ctx: Context) {
    await this.writableCrop(cropId, ctx);
    return this.prisma.medicineApplication.create({ data: { businessId: ctx.businessId, cropId, appliedOn: new Date(body.appliedOn), medicineItemId: body.medicineItemId, quantity: new Prisma.Decimal(body.quantity), unit: body.unit, method: body.method, reason: body.reason, costPaise: BigInt(body.costPaise), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async health(cropId: string, body: HealthInput, ctx: Context) {
    await this.writableCrop(cropId, ctx);
    return this.prisma.healthEvent.create({ data: { businessId: ctx.businessId, cropId, eventDate: new Date(body.eventDate), doc: body.doc, symptoms: body.symptoms, mortalityCount: body.mortalityCount, labTested: body.labTested, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async attendance(body: AttendanceInput, ctx: Context) {
    if (body.cropId) await this.writableCrop(body.cropId, ctx);
    if (body.pondId) this.scope.assertPondScope(ctx, body.pondId);
    return this.prisma.attendanceLog.create({ data: { businessId: ctx.businessId, labourId: body.labourId, pondId: body.pondId, cropId: body.cropId, workDate: new Date(body.workDate), days: new Prisma.Decimal(body.days), amountPaise: BigInt(body.amountPaise), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }
}
