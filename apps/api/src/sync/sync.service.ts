import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QueryScope, ScopeUser } from '../authorization/query-scope';
import { PrismaService } from '../platform/prisma.service';
import { SyncPushDto } from './sync.dto';

type Context = ScopeUser & { deviceId: string };
const financial = new Set(['expense']);
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

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService, private readonly scope: QueryScope) {}

  async pull(since: string | undefined, limit: number, user: Context) {
    const cursor = since ? new Date(since) : new Date(0);
    const snapshot = new Date();
    const pondIds = user.role === 'OPERATOR' && !user.pondScope.includes('*') ? user.pondScope : undefined;
    const cropWhere = { businessId: user.businessId, voidedAt: null, updatedAt: { gt: cursor, lte: snapshot }, ...(pondIds ? { pondId: { in: pondIds } } : {}) };
    const [crops, feedLogs, waterReadings, expenses, theme] = await Promise.all([
      this.prisma.crop.findMany({ where: cropWhere, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: limit }),
      this.prisma.feedLog.findMany({ where: { businessId: user.businessId, voidedAt: null, updatedAt: { gt: cursor, lte: snapshot }, ...(pondIds ? { crop: { pondId: { in: pondIds } } } : {}) }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: limit }),
      this.prisma.waterReading.findMany({ where: { businessId: user.businessId, voidedAt: null, updatedAt: { gt: cursor, lte: snapshot }, ...(pondIds ? { pondId: { in: pondIds } } : {}) }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: limit }),
      user.role === 'OPERATOR' && !user.financialAccess ? Promise.resolve([]) : this.prisma.expense.findMany({ where: { businessId: user.businessId, voidedAt: null, updatedAt: { gt: cursor, lte: snapshot } }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: limit }),
      this.prisma.businessTheme.findUnique({ where: { businessId: user.businessId } }),
    ]);
    const changes = [
      ...crops.map((record) => ({ entity: 'crop', record })),
      ...feedLogs.map((record) => ({ entity: 'feedLog', record })),
      ...waterReadings.map((record) => ({ entity: 'waterReading', record })),
      ...(user.role === 'OPERATOR' && !user.financialAccess ? [] : expenses.map((record) => ({ entity: 'expense', record }))),
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
    if (financial.has(record.entity) && !ctx.financialAccess && ctx.role !== 'AE_OWNER') return { id: record.id, status: 'rejected', reason: 'Financial access is not enabled' };
    const payload = record.payload;
    const normalized = record.entity === 'feedLog' ? safeFeedLog(payload) : record.entity === 'waterReading' ? safeWaterReading(payload) : safeExpense(payload);
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
        : await tx.expense.findFirst({ where: { id: record.id, businessId: ctx.businessId } });
    if (existing && record.entity === 'expense') {
      await tx.syncConflict.create({ data: { businessId: ctx.businessId, entity: record.entity, entityId: record.id, class: 'FINANCIAL', serverRev: existing.rev, clientPayload: asJson(record.payload), serverPayload: asJson(existing), status: 'OPEN', createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
      return { id: record.id, status: 'conflict', reason: 'Financial record requires explicit resolution' };
    }
    if (existing) {
      if (record.entity === 'feedLog') await tx.feedLog.update({ where: { id: record.id }, data: { ...normalized as unknown as Prisma.FeedLogUpdateInput, rev: { increment: 1n }, updatedBy: ctx.userId } });
      else await tx.waterReading.update({ where: { id: record.id }, data: { ...normalized as unknown as Prisma.WaterReadingUpdateInput, rev: { increment: 1n }, updatedBy: ctx.userId } });
      await tx.syncConflict.create({ data: { businessId: ctx.businessId, entity: record.entity, entityId: record.id, class: 'OPERATIONAL', serverRev: existing.rev, clientPayload: asJson(record.payload), serverPayload: asJson(existing), status: 'OPEN', createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    } else if (record.entity === 'feedLog') {
      await tx.feedLog.create({ data: { ...normalized as unknown as Prisma.FeedLogCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    } else if (record.entity === 'waterReading') {
      await tx.waterReading.create({ data: { ...normalized as unknown as Prisma.WaterReadingCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    } else {
      await tx.expense.create({ data: { ...normalized as unknown as Prisma.ExpenseCreateInput, id: record.id, businessId: ctx.businessId, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
    }
    await tx.outboxReceipt.create({ data: { businessId: ctx.businessId, deviceId: ctx.deviceId, idempotencyKey: record.idempotencyKey, entity: record.entity, entityId: record.id, appliedRev: existing?.rev ?? 0n, receivedAt: new Date(), createdBy: ctx.userId, updatedBy: ctx.userId } });
    return { id: record.id, status: 'applied' };
  }
}
