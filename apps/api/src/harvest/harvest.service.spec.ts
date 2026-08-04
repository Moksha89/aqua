import { HarvestService } from './harvest.service';
import { UserRole } from '../auth/roles';
import { AllocationService } from '../allocation/allocation.service';
import { QueryScope } from '../authorization/query-scope';

describe('HarvestService closure sequence', () => {
  it('freezes a new P&L version and closes the pond', async () => {
    const tx = {
      crop: {
        findFirst: jest.fn().mockResolvedValue({ id: 'crop', pondId: 'pond' }),
        update: jest.fn().mockResolvedValue({}),
      },
      cropPnl: {
        findFirst: jest.fn().mockResolvedValue({ id: 'old', version: 2, isCurrent: true }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'new', version: 3, isCurrent: true }),
      },
      cropClosureChecklist: { findMany: jest.fn().mockResolvedValue(['CONFIRM_HARVESTS', 'ZERO_COST_HEADS', 'RECONCILE_FEED_STOCK', 'POST_OCCUPANCY_COSTS', 'CLOSURE_ALLOCATION'].map((step) => ({ step, status: 'COMPLETED' }))) },
      pond: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn((fn: (value: typeof tx) => unknown) => fn(tx)) };
    const service = new HarvestService(prisma as never, {} as AllocationService, { assertPondScope: jest.fn() } as unknown as QueryScope);
    const result = await service.close('crop', { businessId: 'business', userId: 'user', role: UserRole.OWNER, financialAccess: true, pondScope: ['*'], deviceId: 'device' });
    expect(result).toEqual({ cropId: 'crop', status: 'CLOSED', pnlFrozen: true, pnl: { id: 'new', version: 3, isCurrent: true } });
    expect(tx.cropPnl.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: { isCurrent: false } });
    expect(tx.cropPnl.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ version: 3, isCurrent: true }) }));
    expect(tx.crop.update).toHaveBeenCalled();
    expect(tx.pond.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'pond' }, data: expect.objectContaining({ status: 'IDLE' }) }));
  });

  it('rejects writes to a closed crop', async () => {
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn({ crop: { findFirst: jest.fn().mockResolvedValue({ status: 'CLOSED' }) } })) };
    const service = new HarvestService(prisma as never, {} as AllocationService, { assertPondScope: jest.fn() } as unknown as QueryScope);
    await expect(service.harvest('crop', { harvestDate: '2026-01-01', doc: 1, type: 'FINAL', reason: 'OTHER', sampleTaken: false, lines: [{ basis: 'GRADE', key: 'A', quantityKg: '1', ratePerKgPaise: '100' }] }, { businessId: 'business', userId: 'user', role: UserRole.OWNER, financialAccess: true, pondScope: ['*'], deviceId: 'device' })).rejects.toThrow('Closed crops are read-only');
  });

  it('completes empty cost-head and feed-stock steps without acknowledgements', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      crop: { findFirst: jest.fn().mockResolvedValue({ id: 'crop', businessId: 'business', preparationStartDate: new Date() }) },
      costHead: { findMany: jest.fn().mockResolvedValue([{ id: 'head' }]) },
      expense: { groupBy: jest.fn().mockResolvedValue([]) },
      apportionedCost: { groupBy: jest.fn().mockResolvedValue([]) },
      cropInputBalance: { findMany: jest.fn().mockResolvedValue([]) },
      cropClosureChecklist: { updateMany },
    };
    const service = new HarvestService(prisma as never, {} as AllocationService, { assertPondScope: jest.fn() } as unknown as QueryScope);
    const ctx = { businessId: 'business', userId: 'user', role: UserRole.OWNER, financialAccess: true, pondScope: ['*'], deviceId: 'device' };

    await expect(service.executeStep('crop', 'ZERO_COST_HEADS', undefined, ctx)).resolves.toEqual({ count: 1 });
    await expect(service.executeStep('crop', 'RECONCILE_FEED_STOCK', undefined, ctx)).resolves.toEqual({ count: 1 });
    expect(updateMany).toHaveBeenCalledTimes(2);
  });
});
