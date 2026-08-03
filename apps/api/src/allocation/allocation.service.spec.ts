import { AllocationService } from './allocation.service';

describe('AllocationService', () => {
  it('writes computed allocation rows with derivations and completes the run', async () => {
    const tx = {
      allocationRun: {
        create: jest.fn().mockResolvedValue({ id: 'run' }),
        update: jest.fn().mockResolvedValue({ id: 'run', status: 'ALLOCATED' }),
      },
      crop: { findMany: jest.fn().mockResolvedValue([{ id: 'crop', preparationStartDate: new Date('2026-01-01') }]) },
      apportionedCost: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn((fn: (value: typeof tx) => unknown) => fn(tx)) };
    const service = new AllocationService(prisma as never);
    await service.run({ periodStart: '2026-01-01', periodEnd: '2026-01-31' }, { businessId: 'business', userId: 'user', deviceId: 'device' });
    expect(tx.apportionedCost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ derivation: expect.objectContaining({ status: 'NOT_DETERMINABLE' }) }) }));
    expect(tx.allocationRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ALLOCATED' }) }));
  });
});
