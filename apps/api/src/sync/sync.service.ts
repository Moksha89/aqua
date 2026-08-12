import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QueryScope, ScopeUser } from '../authorization/query-scope';
import { PrismaService } from '../platform/prisma.service';
import { abw, massMg } from '../rules-engine';
import { SyncPushDto } from './sync.dto';

import { UserRole } from '../auth/roles';
type Context = ScopeUser & { deviceId: string };
const financial = new Set(['expense', 'payment', 'harvestEvent', 'harvestLine', 'attendanceLog', 'medicineApplication']);
const isFinancialEntity = (entity: string) => financial.has(entity);
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item)) as Prisma.InputJsonValue;
const text = (payload: Record<string, unknown>, key: string) => {
  const value = payload[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${key} is required`);
  return value;
};
const decimal = (payload: Record<string, unknown>, key: string) => {
  const value = payload[key];
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error(`${key} is required`);
  return new Prisma.Decimal(value);
};
const safeFeedLog = (payload: Record<string, unknown>) => ({
  cropId: text(payload, 'cropId'), logDate: new Date(text(payload, 'logDate')), mealSlot: text(payload, 'mealSlot'),
  feedItemId: text(payload, 'feedItemId'), quantityKg: decimal(payload, 'quantityKg'),
  bags: typeof payload.bags === 'number' ? payload.bags : undefined,
  looseKg: payload.looseKg === undefined ? undefined : decimal(payload, 'looseKg'),
  feederLabourId: typeof payload.feederLabourId === 'string' ? payload.feederLabourId : undefined,
  appliedRatePaise: typeof payload.appliedRatePaise === 'string' ? BigInt(payload.appliedRatePaise) : undefined,
  remarks: typeof payload.remarks === 'string' ? payload.remarks : undefined,
});
const safeWaterReading = (payload: Record<string, unknown>) => ({
  cropId: typeof payload.cropId === 'string' ? payload.cropId : undefined, pondId: text(payload, 'pondId'),
  readAt: new Date(text(payload, 'readAt')), slot: text(payload, 'slot'), source: text(payload, 'source'),
  salinityPpt: payload.salinityPpt === undefined ? undefined : decimal(payload, 'salinityPpt'),
  ph: payload.ph === undefined ? undefined : decimal(payload, 'ph'),
  doMgl: payload.doMgl === undefined ? undefined : decimal(payload, 'doMgl'),
  temperatureC: payload.temperatureC === undefined ? undefined : decimal(payload, 'temperatureC'),
  remarks: typeof payload.remarks === 'string' ? payload.remarks : undefined,
});
const safeExpense = (payload: Record<string, unknown>) => ({
  expenseDate: new Date(text(payload, 'expenseDate')), costHeadId: text(payload, 'costHeadId'),
  allocationTarget: text(payload, 'allocationTarget') as 'POND_CROP' | 'COMMON',
  pondId: typeof payload.pondId === 'string' ? payload.pondId : undefined,
  cropId: typeof payload.cropId === 'string' ? payload.cropId : undefined,
  commonPoolId: typeof payload.commonPoolId === 'string' ? payload.commonPoolId : undefined,
  amountPaise: BigInt(text(payload, 'amountPaise')),
  quantity: payload.quantity === undefined ? undefined : decimal(payload, 'quantity'),
  ratePaise: typeof payload.ratePaise === 'string' ? BigInt(payload.ratePaise) : undefined,
  partyId: typeof payload.partyId === 'string' ? payload.partyId : undefined,
  paymentStatus: (typeof payload.paymentStatus === 'string' ? payload.paymentStatus : 'UNPAID') as 'PAID' | 'UNPAID' | 'PART_PAID',
  remarks: typeof payload.remarks === 'string' ? payload.remarks : undefined,
  ratePending: payload.ratePending === true,
});
const safeGrowthSample = (p: Record<string, unknown>) => {
  const animalsInSample = Number(p.animalsInSample);
  const sampleWeightG = decimal(p, 'sampleWeightG');
  const computedAbw = abw(massMg(BigInt(Math.round(Number(sampleWeightG.toString()) * 1000)),), BigInt(animalsInSample));
  return { cropId: text(p, 'cropId'), sampledOn: new Date(text(p, 'sampledOn')), doc: Number(p.doc), animalsInSample, sampleWeightG, speciesId: typeof p.speciesId === 'string' ? p.speciesId : undefined, individualWeightsG: Array.isArray(p.individualWeightsG) ? p.individualWeightsG.map(String) : [], abwG: new Prisma.Decimal(Number(computedAbw.value ?? 0) / 1000), healthNotes: typeof p.healthNotes === 'string' ? p.healthNotes : undefined };
};
const safeTrayReading = (p: Record<string, unknown>) => ({ checkTrayId: text(p, 'checkTrayId'), cropId: text(p, 'cropId'), readAt: new Date(text(p, 'readAt')), feedPlacedKg: decimal(p, 'feedPlacedKg'), residualCode: text(p, 'residualCode'), residualWeightG: p.residualWeightG === undefined ? undefined : decimal(p, 'residualWeightG'), gutFullness: typeof p.gutFullness === 'string' ? p.gutFullness : undefined, colour: typeof p.colour === 'string' ? p.colour : undefined, activity: typeof p.activity === 'string' ? p.activity : undefined, moulting: typeof p.moulting === 'string' ? p.moulting : undefined, deadSeen: typeof p.deadSeen === 'number' ? p.deadSeen : undefined });
const safeMedicine = (p: Record<string, unknown>) => ({ cropId: text(p, 'cropId'), appliedOn: new Date(text(p, 'appliedOn')), medicineItemId: text(p, 'medicineItemId'), quantity: decimal(p, 'quantity'), unit: text(p, 'unit'), method: text(p, 'method'), reason: text(p, 'reason'), costPaise: BigInt(text(p, 'costPaise')) });
const safeHealth = (p: Record<string, unknown>) => ({ cropId: text(p, 'cropId'), eventDate: new Date(text(p, 'eventDate')), doc: Number(p.doc), symptoms: Array.isArray(p.symptoms) ? p.symptoms.map(String) : [], mortalityCount: typeof p.mortalityCount === 'number' ? p.mortalityCount : undefined, labTested: p.labTested === true, suspectedCause: typeof p.suspectedCause === 'string' ? p.suspectedCause : undefined, treatment: typeof p.treatment === 'string' ? p.treatment : undefined });
const safeAttendance = (p: Record<string, unknown>) => ({ labourId: text(p, 'labourId'), pondId: typeof p.pondId === 'string' ? p.pondId : undefined, cropId: typeof p.cropId === 'string' ? p.cropId : undefined, workDate: new Date(text(p, 'workDate')), days: decimal(p, 'days'), amountPaise: BigInt(text(p, 'amountPaise')) });
const safePayment = (p: Record<string, unknown>) => ({ partyId: text(p, 'partyId'), paidOn: new Date(text(p, 'paidOn')), direction: text(p, 'direction'), amountPaise: BigInt(text(p, 'amountPaise')), mode: text(p, 'mode'), reference: typeof p.reference === 'string' ? p.reference : undefined, notes: typeof p.notes === 'string' ? p.notes : undefined });
const safeHarvestEvent = (p: Record<string, unknown>) => ({ cropId: text(p, 'cropId'), harvestDate: new Date(text(p, 'harvestDate')), doc: Number(p.doc), type: text(p, 'type'), reason: text(p, 'reason'), sampleTaken: p.sampleTaken === true, sampleCount: typeof p.sampleCount === 'number' ? p.sampleCount : undefined, sampleWeightG: p.sampleWeightG === undefined ? undefined : decimal(p, 'sampleWeightG'), grossValuePaise: BigInt(text(p, 'grossValuePaise')), deductionsPaise: BigInt(text(p, 'deductionsPaise')), netRealisationPaise: BigInt(text(p, 'netRealisationPaise')), receivablePaise: BigInt(text(p, 'receivablePaise')) });
const safeHarvestLine = (p: Record<string, unknown>) => ({ harvestEventId: text(p, 'harvestEventId'), speciesId: typeof p.speciesId === 'string' ? p.speciesId : undefined, basis: text(p, 'basis'), key: text(p, 'key'), quantityKg: decimal(p, 'quantityKg'), ratePerKgPaise: BigInt(text(p, 'ratePerKgPaise')), lineValuePaise: BigInt(text(p, 'lineValuePaise')) });
const safePreparation = (p: Record<string, unknown>) => ({ pondId: text(p, 'pondId'), cropId: typeof p.cropId === 'string' ? p.cropId : undefined, templateItemId: typeof p.templateItemId === 'string' ? p.templateItemId : undefined, name: text(p, 'name'), startDate: new Date(text(p, 'startDate')), completionDate: typeof p.completionDate === 'string' ? new Date(p.completionDate) : undefined, labourCostPaise: BigInt(text(p, 'labourCostPaise')), materialCostPaise: BigInt(text(p, 'materialCostPaise')), amountPaise: BigInt(text(p, 'amountPaise')), remarks: typeof p.remarks === 'string' ? p.remarks : undefined });

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService, private readonly scope: QueryScope) {}

  async pull(since: string | undefined, limit: number, user: Context) {
    const cursor = since ? new Date(since) : new Date(0);
    const snapshot = new Date();
    this.scope.pondWhere(user);
    const pondIds = user.role === UserRole.OPERATOR && !user.pondScope.includes('*') ? user.pondScope : undefined;
    const cropWhere = { businessId: user.businessId, voidedAt: null, updatedAt: { gt: cursor, lte: snapshot }, ...(pondIds ? { pondId: { in: pondIds } } : {}) };
    const scopedCrops = pondIds ? await this.prisma.crop.findMany({ where: { businessId: user.businessId, voidedAt: null, pondId: { in: pondIds } }, select: { id: true } }) : [];
    const scopedCropIds = pondIds ? scopedCrops.map((crop) => crop.id) : undefined;
    const [crops, feedLogs, waterReadings, expenses, theme] = await Promise.all([
      this.prisma.crop.findMany({ where: cropWhere, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: limit }),
      this.prisma.feedLog.findMany({ where: { businessId: user.businessId, voidedAt: null, updatedAt: { gt: cursor, lte: snapshot }, ...(scopedCropIds ? { cropId: { in: scopedCropIds } } : {}) }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: limit }),
      this.prisma.waterReading.findMany({ where: { businessId: user.businessId, voidedAt: null, updatedAt: { gt: cursor, lte: snapshot }, ...(pondIds ? { pondId: { in: pondIds } } : {}) }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: limit }),
      user.role === UserRole.OPERATOR && !user.financialAccess ? Promise.resolve([]) : this.prisma.expense.findMany({ where: { businessId: user.businessId, voidedAt: null, updatedAt: { gt: cursor, lte: snapshot } }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: limit }),
      this.prisma.businessTheme.findUnique({ where: { businessId: user.businessId } }),
    ]);
    const changes = [
      ...crops.map((record) => ({ entity: 'crop', record })),
      ...feedLogs.map((record) => ({ entity: 'feedLog', record })),
      ...waterReadings.map((record) => ({ entity: 'waterReading', record })),
      ...(user.role === UserRole.OPERATOR && !user.financialAccess ? [] : expenses.map((record) => ({ entity: 'expense', record }))),
    ].sort((a, b) => a.record.updatedAt.getTime() - b.record.updatedAt.getTime() || a.record.id.localeCompare(b.record.id));
    return { snapshot: snapshot.toISOString(), cursor: snapshot.toISOString(), hasMore: changes.length > limit, changes: changes.slice(0, limit), theme: theme ? { tokens: theme.tokens, updatedAt: theme.updatedAt, revision: theme.rev } : null };
  }

  async push(input: SyncPushDto, ctx: Context) {
    const receipts: { id: string; status: string; reason?: string }[] = [];
    for (const record of input.records) {
      const receipt = await this.prisma.$transaction(async (tx) => this.applyRecord(tx, record, ctx));
      receipts.push(receipt);
    }
    return { receipts };
  }

  private async applyRecord(tx: Prisma.TransactionClient, record: SyncPushDto['records'][number], ctx: Context) {
    const prior = await tx.outboxReceipt.findUnique({ where: { idempotencyKey: record.idempotencyKey } });
    if (prior) return { id: record.id, status: 'duplicate' };
    if (isFinancialEntity(record.entity) && !ctx.financialAccess && ctx.role !== UserRole.OWNER) return { id: record.id, status: 'rejected', reason: 'Financial access is not enabled' };
    const payload = record.payload;
    let normalized: object;
    try {
      normalized = record.entity === 'feedLog' ? safeFeedLog(payload) : record.entity === 'waterReading' ? safeWaterReading(payload) : record.entity === 'expense' ? safeExpense(payload) : record.entity === 'growthSample' ? safeGrowthSample(payload) : record.entity === 'checkTrayReading' ? safeTrayReading(payload) : record.entity === 'medicineApplication' ? safeMedicine(payload) : record.entity === 'healthEvent' ? safeHealth(payload) : record.entity === 'attendanceLog' ? safeAttendance(payload) : record.entity === 'payment' ? safePayment(payload) : record.entity === 'harvestEvent' ? safeHarvestEvent(payload) : record.entity === 'harvestLine' ? safeHarvestLine(payload) : safePreparation(payload);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid sync payload');
    }
    const cropId = typeof payload.cropId === 'string' ? payload.cropId : undefined;
    if (cropId) {
      const crop = await tx.crop.findFirst({ where: { id: cropId, businessId: ctx.businessId, voidedAt: null }, select: { status: true } });
      if (!crop) return { id: record.id, status: 'rejected', reason: 'Crop not found' };
      if (crop.status === 'CLOSED') return { id: record.id, status: 'rejected', reason: 'Closed crops are read-only' };
    }
    const existing = record.entity === 'feedLog'
      ? await tx.feedLog.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
      : record.entity === 'waterReading'
        ? await tx.waterReading.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
        : record.entity === 'expense'
          ? await tx.expense.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
          : record.entity === 'growthSample' ? await tx.growthSample.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
            : record.entity === 'checkTrayReading' ? await tx.checkTrayReading.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
              : record.entity === 'medicineApplication' ? await tx.medicineApplication.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
                : record.entity === 'healthEvent' ? await tx.healthEvent.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
                  : record.entity === 'attendanceLog' ? await tx.attendanceLog.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
                    : record.entity === 'payment' ? await tx.payment.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
                      : record.entity === 'harvestEvent' ? await tx.harvestEvent.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
                        : record.entity === 'harvestLine' ? await tx.harvestLine.findFirst({ where: { id: record.id, businessId: ctx.businessId } })
                          : await tx.preparationActivity.findFirst({ where: { id: record.id, businessId: ctx.businessId } });
    const existingRev = existing && typeof existing === 'object' && 'rev' in existing ? existing.rev as bigint : 0n;
    if (existing && isFinancialEntity(record.entity)) {
      await tx.syncConflict.create({ data: { businessId: ctx.businessId, entity: record.entity, entityId: record.id, class: 'FINANCIAL', serverRev: existingRev, clientPayload: asJson(record.payload), serverPayload: asJson(existing), status: 'OPEN', createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      return { id: record.id, status: 'conflict', reason: 'Financial record requires explicit resolution' };
    }
    if (existing) {
      const data = { ...normalized as object, rev: { increment: 1n }, updatedBy: ctx.userId };
      if (record.entity === 'feedLog') await tx.feedLog.update({ where: { id: record.id }, data: data as Prisma.FeedLogUpdateInput });
      else if (record.entity === 'waterReading') await tx.waterReading.update({ where: { id: record.id }, data: data as Prisma.WaterReadingUpdateInput });
      else if (record.entity === 'expense') await tx.expense.update({ where: { id: record.id }, data: data as Prisma.ExpenseUpdateInput });
      else if (record.entity === 'growthSample') await tx.growthSample.update({ where: { id: record.id }, data: data as Prisma.GrowthSampleUpdateInput });
      else if (record.entity === 'checkTrayReading') await tx.checkTrayReading.update({ where: { id: record.id }, data: data as Prisma.CheckTrayReadingUpdateInput });
      else if (record.entity === 'medicineApplication') await tx.medicineApplication.update({ where: { id: record.id }, data: data as Prisma.MedicineApplicationUpdateInput });
      else if (record.entity === 'healthEvent') await tx.healthEvent.update({ where: { id: record.id }, data: data as Prisma.HealthEventUpdateInput });
      else if (record.entity === 'attendanceLog') await tx.attendanceLog.update({ where: { id: record.id }, data: data as Prisma.AttendanceLogUpdateInput });
      else if (record.entity === 'payment') await tx.payment.update({ where: { id: record.id }, data: data as Prisma.PaymentUpdateInput });
      else if (record.entity === 'harvestEvent') await tx.harvestEvent.update({ where: { id: record.id }, data: data as Prisma.HarvestEventUpdateInput });
      else if (record.entity === 'harvestLine') await tx.harvestLine.update({ where: { id: record.id }, data: data as Prisma.HarvestLineUpdateInput });
      else await tx.preparationActivity.update({ where: { id: record.id }, data: data as Prisma.PreparationActivityUpdateInput });
      await tx.syncConflict.create({ data: { businessId: ctx.businessId, entity: record.entity, entityId: record.id, class: 'OPERATIONAL', serverRev: existingRev, clientPayload: asJson(record.payload), serverPayload: asJson(existing), status: 'OPEN', createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    } else if (record.entity === 'feedLog') {
      await tx.feedLog.create({ data: { ...normalized as unknown as Prisma.FeedLogCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    } else if (record.entity === 'waterReading') {
      await tx.waterReading.create({ data: { ...normalized as unknown as Prisma.WaterReadingCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    } else if (record.entity === 'expense') {
      await tx.expense.create({ data: { ...normalized as unknown as Prisma.ExpenseCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    } else if (record.entity === 'growthSample') await tx.growthSample.create({ data: { ...normalized as unknown as Prisma.GrowthSampleCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    else if (record.entity === 'checkTrayReading') await tx.checkTrayReading.create({ data: { ...normalized as unknown as Prisma.CheckTrayReadingCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    else if (record.entity === 'medicineApplication') await tx.medicineApplication.create({ data: { ...normalized as unknown as Prisma.MedicineApplicationCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    else if (record.entity === 'healthEvent') await tx.healthEvent.create({ data: { ...normalized as unknown as Prisma.HealthEventCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    else if (record.entity === 'attendanceLog') await tx.attendanceLog.create({ data: { ...normalized as unknown as Prisma.AttendanceLogCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    else if (record.entity === 'payment') await tx.payment.create({ data: { ...normalized as unknown as Prisma.PaymentCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    else if (record.entity === 'harvestEvent') await tx.harvestEvent.create({ data: { ...normalized as unknown as Prisma.HarvestEventCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    else if (record.entity === 'harvestLine') await tx.harvestLine.create({ data: { ...normalized as unknown as Prisma.HarvestLineCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    else await tx.preparationActivity.create({ data: { ...normalized as unknown as Prisma.PreparationActivityCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    await tx.outboxReceipt.create({ data: { businessId: ctx.businessId, deviceId: ctx.deviceId, idempotencyKey: record.idempotencyKey, entity: record.entity, entityId: record.id, appliedRev: existingRev, receivedAt: new Date(), createdBy: ctx.userId, updatedBy: ctx.userId } });
    return { id: record.id, status: 'applied' };
  }
}
