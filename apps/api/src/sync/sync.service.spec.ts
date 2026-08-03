import { SyncService } from './sync.service';
import { DEFAULT_BUSINESS_THEME } from '../theme/theme.defaults';

const ctx = { businessId: 'b', userId: 'u', deviceId: 'd', role: 'AE_OWNER', financialAccess: true, pondScope: ['p1'] };

describe('SyncService', () => {
  it('replays a record as a duplicate', async () => {
    const tx = { outboxReceipt: { findUnique: jest.fn().mockResolvedValue({ id: 'r' }) } };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, {} as never);
    await expect(service.push({ records: [{ entity: 'feedLog', id: '11111111-1111-1111-1111-111111111111', idempotencyKey: 'k', payload: {} }] }, ctx)).resolves.toEqual({ receipts: [{ id: '11111111-1111-1111-1111-111111111111', status: 'duplicate' }] });
  });

  it('records a financial conflict without overwriting', async () => {
    const tx = { outboxReceipt: { findUnique: jest.fn().mockResolvedValue(null) }, expense: { findFirst: jest.fn().mockResolvedValue({ id: 'e', rev: 2n }), update: jest.fn() }, syncConflict: { create: jest.fn() } };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, {} as never);
    const result = await service.push({ records: [{ entity: 'expense', id: '11111111-1111-1111-1111-111111111111', idempotencyKey: 'k', payload: {} }] }, ctx);
    expect(result.receipts[0]!.status).toBe('conflict');
    expect(tx.expense.update).not.toHaveBeenCalled();
    expect(tx.syncConflict.create).toHaveBeenCalled();
  });

  it('applies an operational conflict and records a marker', async () => {
    const tx = { outboxReceipt: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() }, feedLog: { findFirst: jest.fn().mockResolvedValue({ id: 'e', rev: 2n }), update: jest.fn() }, syncConflict: { create: jest.fn() } };
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn(tx)) };
    const service = new SyncService(prisma as never, {} as never);
    const result = await service.push({ records: [{ entity: 'feedLog', id: '11111111-1111-1111-1111-111111111111', idempotencyKey: 'k', payload: {} }] }, ctx);
    expect(result.receipts[0]!.status).toBe('applied');
    expect(tx.feedLog.update).toHaveBeenCalled();
    expect(tx.syncConflict.create).toHaveBeenCalled();
  });

  it('pulls operator pond data without financial entities and includes theme', async () => {
    const prisma = {
      crop: { findMany: jest.fn().mockResolvedValue([]) }, feedLog: { findMany: jest.fn().mockResolvedValue([]) }, waterReading: { findMany: jest.fn().mockResolvedValue([]) }, expense: { findMany: jest.fn() }, businessTheme: { findUnique: jest.fn().mockResolvedValue({ tokens: DEFAULT_BUSINESS_THEME, updatedAt: new Date(), rev: 1n }) },
    };
    const service = new SyncService(prisma as never, {} as never);
    const result = await service.pull(undefined, 100, { ...ctx, role: 'OPERATOR', financialAccess: false });
    expect(result.changes).not.toHaveProperty('expenses');
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
    expect(result.theme).toBeTruthy();
    expect(prisma.waterReading.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ pondId: { in: ['p1'] } }) }));
  });
});
