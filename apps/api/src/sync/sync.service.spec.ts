import { SyncService } from './sync.service';
import { DEFAULT_BUSINESS_THEME } from '../theme/theme.defaults';

import { UserRole } from '../auth/roles';
const ctx = { businessId: 'b', userId: 'u', deviceId: 'd', role: UserRole.OWNER, financialAccess: true, pondScope: ['p1'] };

describe('SyncService', () => {
  it('replays a record as a duplicate', async () => {
    const tx = { outboxReceipt: { findUnique: jest.fn().mockResolvedValue({ id: 'r' }) } };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, { pondWhere: jest.fn() } as never);
    await expect(service.push({ records: [{ entity: 'feedLog', id: '11111111-1111-1111-1111-111111111111', idempotencyKey: 'k', payload: {} }] }, ctx)).resolves.toEqual({ receipts: [{ id: '11111111-1111-1111-1111-111111111111', status: 'duplicate' }] });
  });

  it('records a financial conflict without overwriting', async () => {
    const tx = { outboxReceipt: { findUnique: jest.fn().mockResolvedValue(null) }, expense: { findFirst: jest.fn().mockResolvedValue({ id: 'e', rev: 2n }), update: jest.fn() }, syncConflict: { create: jest.fn() } };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, { pondWhere: jest.fn() } as never);
    const result = await service.push({ records: [{ entity: 'expense', id: '11111111-1111-1111-1111-111111111111', idempotencyKey: 'k', payload: { expenseDate: '2026-01-01', costHeadId: 'c', allocationTarget: 'COMMON', commonPoolId: 'p', amountPaise: '100' } }] }, ctx);
    expect(result.receipts[0]!.status).toBe('conflict');
    expect(tx.expense.update).not.toHaveBeenCalled();
    expect(tx.syncConflict.create).toHaveBeenCalled();
  });

  it.each([
    ['payment', { partyId: 'p', paidOn: '2026-01-01', direction: 'OUT', amountPaise: '100', mode: 'CASH' }],
    ['harvestEvent', { cropId: 'c', harvestDate: '2026-01-01', doc: 1, type: 'PARTIAL', reason: 'OTHER', sampleTaken: false, grossValuePaise: '100', deductionsPaise: '0', netRealisationPaise: '100', receivablePaise: '100' }],
    ['harvestLine', { harvestEventId: 'h', basis: 'COUNT', key: '1', quantityKg: '1', ratePerKgPaise: '100', lineValuePaise: '100' }],
    ['attendanceLog', { workDate: '2026-01-01', labourId: 'l', days: '1', amountPaise: '100' }],
    ['medicineApplication', { cropId: 'c', appliedOn: '2026-01-01', medicineItemId: 'm', quantity: '1', unit: 'KG', method: 'MIXED', reason: 'OTHER', costPaise: '100' }],
  ])('protects replayed financial %s records from overwrite', async (entity, payload) => {
    const model = entity === 'harvestEvent' ? 'harvestEvent' : entity === 'harvestLine' ? 'harvestLine' : entity === 'attendanceLog' ? 'attendanceLog' : entity === 'medicineApplication' ? 'medicineApplication' : 'payment';
    const tx = {
      outboxReceipt: { findUnique: jest.fn().mockResolvedValue(null) },
      [model]: { findFirst: jest.fn().mockResolvedValue({ id: 'existing', rev: 2n }), update: jest.fn() },
      syncConflict: { create: jest.fn() },
      crop: { findFirst: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
    };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, { pondWhere: jest.fn() } as never);
    const result = await service.push({ records: [{ entity: entity as never, id: '11111111-1111-1111-1111-111111111111', idempotencyKey: `k-${entity}`, payload }] }, ctx);
    expect(result.receipts[0]!.status).toBe('conflict');
    expect((tx as unknown as Record<string, { update: jest.Mock }>)[model]!.update).not.toHaveBeenCalled();
    expect(tx.syncConflict.create).toHaveBeenCalled();
  });

  it('applies an operational conflict and records a marker', async () => {
    const tx = { crop: { findFirst: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) }, outboxReceipt: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() }, feedLog: { findFirst: jest.fn().mockResolvedValue({ id: 'e', rev: 2n }), update: jest.fn() }, syncConflict: { create: jest.fn() } };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, { pondWhere: jest.fn() } as never);
    const result = await service.push({ records: [{ entity: 'feedLog', id: '11111111-1111-1111-1111-111111111111', idempotencyKey: 'k', payload: { cropId: 'c', logDate: '2026-01-01', mealSlot: 'AM', feedItemId: 'f', quantityKg: '1' } }] }, ctx);
    expect(result.receipts[0]!.status).toBe('applied');
    expect(tx.feedLog.update).toHaveBeenCalled();
    expect(tx.syncConflict.create).toHaveBeenCalled();
  });

  it('pulls operator pond data without financial entities and includes theme', async () => {
    const prisma = {
      crop: { findMany: jest.fn().mockResolvedValue([]) }, feedLog: { findMany: jest.fn().mockResolvedValue([]) }, waterReading: { findMany: jest.fn().mockResolvedValue([]) }, expense: { findMany: jest.fn() }, businessTheme: { findUnique: jest.fn().mockResolvedValue({ tokens: DEFAULT_BUSINESS_THEME, updatedAt: new Date(), rev: 1n }) },
    };
    const service = new SyncService(prisma as never, { pondWhere: jest.fn() } as never);
    const result = await service.pull(undefined, 100, { ...ctx, role: UserRole.OPERATOR, financialAccess: false });
    expect(result.changes).not.toHaveProperty('expenses');
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
    expect(result.theme).toBeTruthy();
    expect(prisma.waterReading.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ pondId: { in: ['p1'] } }) }));
  });

  it('rejects writes targeting a closed crop', async () => {
    const tx = { crop: { findFirst: jest.fn().mockResolvedValue({ status: 'CLOSED' }) }, outboxReceipt: { findUnique: jest.fn().mockResolvedValue(null) } };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, { pondWhere: jest.fn() } as never);
    const result = await service.push({ records: [{ entity: 'feedLog', id: '11111111-1111-1111-1111-111111111111', idempotencyKey: 'closed', payload: { cropId: 'c', logDate: '2026-01-01', mealSlot: 'AM', feedItemId: 'f', quantityKg: '1' } }] }, ctx);
    expect(result.receipts[0]!.status).toBe('rejected');
    expect(result.receipts[0]!.reason).toContain('read-only');
  });

  it('returns a client error for an unmappable payload instead of a server error', async () => {
    const tx = { outboxReceipt: { findUnique: jest.fn().mockResolvedValue(null) } };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, { pondWhere: jest.fn() } as never);
    await expect(service.push({ records: [{ entity: 'waterReading', id: '11111111-1111-1111-1111-111111111111', idempotencyKey: 'bad-water', payload: { quantityKg: '1' } }] }, ctx)).rejects.toMatchObject({ response: expect.objectContaining({ statusCode: 400 }) });
  });

  it('uses one snapshot cursor and globally orders changes across streams', async () => {
    const first = new Date('2026-01-01T00:00:01Z');
    const second = new Date('2026-01-01T00:00:02Z');
    const prisma = {
      crop: { findMany: jest.fn().mockResolvedValue([{ id: 'c', updatedAt: second }]) },
      feedLog: { findMany: jest.fn().mockResolvedValue([{ id: 'f', updatedAt: first }]) },
      waterReading: { findMany: jest.fn().mockResolvedValue([]) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
      businessTheme: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const scope = { pondWhere: jest.fn().mockReturnValue({ businessId: 'b' }) };
    const service = new SyncService(prisma as never, scope as never);
    const result = await service.pull(undefined, 2, { ...ctx, role: UserRole.OWNER });
    expect(result.changes.map((change) => change.entity)).toEqual(['feedLog', 'crop']);
    expect(result.cursor).toBe(result.snapshot);
    expect(scope.pondWhere).toHaveBeenCalled();
    expect(prisma.crop.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ updatedAt: expect.objectContaining({ lte: new Date(result.snapshot) }) }) }));
  });
});
