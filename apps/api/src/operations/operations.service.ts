import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { abw, massMg } from '../rules-engine';
import { PrismaService } from '../platform/prisma.service';

type Context = { businessId: string; userId: string; deviceId: string };

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async crop(cropId: string, businessId: string) {
    const crop = await this.prisma.crop.findFirst({ where: { id: cropId, businessId, voidedAt: null } });
    if (!crop) throw new NotFoundException('Crop not found');
    return crop;
  }

  async feed(cropId: string, body: { logDate: string; mealSlot: string; feedItemId: string; quantityKg: string; bags?: number; looseKg?: string; remarks?: string }, ctx: Context) {
    const crop = await this.crop(cropId, ctx.businessId);
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
    await this.crop(cropId, ctx.businessId);
    return this.prisma.checkTray.create({ data: { businessId: ctx.businessId, cropId, trayCode: body.trayCode, position: body.position, feedPlacedKg: new Prisma.Decimal(body.feedPlacedKg), checkIntervalMin: body.checkIntervalMin, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async checkTrayReading(cropId: string, body: { checkTrayId: string; readAt: string; feedPlacedKg: string; residualCode: string; residualWeightG?: string }, ctx: Context) {
    await this.crop(cropId, ctx.businessId);
    const verdict = body.residualCode.toUpperCase() === 'NONE' ? 'UNDERFEEDING' : body.residualCode.toUpperCase() === 'HEAVY' ? 'OVERFEEDING' : 'OPTIMAL';
    return this.prisma.checkTrayReading.create({ data: { businessId: ctx.businessId, cropId, checkTrayId: body.checkTrayId, readAt: new Date(body.readAt), feedPlacedKg: new Prisma.Decimal(body.feedPlacedKg), residualCode: body.residualCode, residualWeightG: body.residualWeightG ? new Prisma.Decimal(body.residualWeightG) : undefined, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId, } }).then((reading) => ({ ...reading, verdict }));
  }

  async growth(cropId: string, body: { sampledOn: string; doc: number; animalsInSample: number; sampleWeightG: string; speciesId?: string; healthNotes?: string }, ctx: Context) {
    await this.crop(cropId, ctx.businessId);
    const result = abw(massMg(BigInt(Math.round(Number(body.sampleWeightG) * 1000))), BigInt(body.animalsInSample));
    return this.prisma.growthSample.create({ data: { businessId: ctx.businessId, cropId, speciesId: body.speciesId, sampledOn: new Date(body.sampledOn), doc: body.doc, animalsInSample: body.animalsInSample, sampleWeightG: new Prisma.Decimal(body.sampleWeightG), individualWeightsG: [], abwG: new Prisma.Decimal(Number(result.value ?? 0) / 1000), healthNotes: body.healthNotes, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async water(pondId: string, body: Record<string, unknown>, ctx: Context) {
    return this.prisma.waterReading.create({ data: { businessId: ctx.businessId, pondId, cropId: body.cropId as string | undefined, readAt: new Date(body.readAt as string), slot: body.slot as string, source: body.source as string, ...Object.fromEntries(['salinityPpt','ph','alkalinity','hardness','doMgl','temperatureC','ammonia','nitrite','transparencyCm'].filter((key) => body[key] !== undefined).map((key) => [key, new Prisma.Decimal(String(body[key]))])), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async medicine(cropId: string, body: Record<string, unknown>, ctx: Context) {
    await this.crop(cropId, ctx.businessId);
    return this.prisma.medicineApplication.create({ data: { businessId: ctx.businessId, cropId, appliedOn: new Date(body.appliedOn as string), medicineItemId: body.medicineItemId as string, quantity: new Prisma.Decimal(String(body.quantity)), unit: body.unit as string, method: body.method as string, reason: body.reason as string, costPaise: BigInt(String(body.costPaise)), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async health(cropId: string, body: Record<string, unknown>, ctx: Context) {
    await this.crop(cropId, ctx.businessId);
    return this.prisma.healthEvent.create({ data: { businessId: ctx.businessId, cropId, eventDate: new Date(body.eventDate as string), doc: Number(body.doc), symptoms: body.symptoms as string[], mortalityCount: body.mortalityCount as number | undefined, labTested: Boolean(body.labTested), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }

  async attendance(body: Record<string, unknown>, ctx: Context) {
    return this.prisma.attendanceLog.create({ data: { businessId: ctx.businessId, labourId: body.labourId as string, pondId: body.pondId as string | undefined, cropId: body.cropId as string | undefined, workDate: new Date(body.workDate as string), days: new Prisma.Decimal(String(body.days)), amountPaise: BigInt(String(body.amountPaise)), createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }
}
