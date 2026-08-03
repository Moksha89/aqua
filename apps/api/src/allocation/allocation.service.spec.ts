import { AllocationService } from './allocation.service';

describe('AllocationService', () => {
  it('writes computed allocation rows with derivations and completes the run', async () => {
    const tx = {
      allocationRun: {
        create: jest.fn().mockResolvedValue({ id: 'run' }),
        update: jest.fn().mockResolvedValue({ id: 'run', status: 'ALLOCATED' }),
      },
      crop: { findMany: jest.fn().mockResolvedValue([{ id: 'crop', pondId: 'pond', preparationStartDate: new Date('2026-01-01') }]) },
      pond: { findMany: jest.fn().mockResolvedValue([{ id: 'pond', extentAcres: 1, leaseAgreementId: 'lease' }]) },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
      commonExpensePool: { findMany: jest.fn().mockResolvedValue([]) },
      leaseAgreement: { findFirst: jest.fn().mockResolvedValue({ id: 'lease', ratePerAcrePerAnnumPaise: 36500n }) },
      apportionedCost: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn((fn: (value: typeof tx) => unknown) => fn(tx)) };
    const service = new AllocationService(prisma as never);
    await service.run({ periodStart: '2026-01-01', periodEnd: '2026-01-31' }, { businessId: 'business', userId: 'user', deviceId: 'device' });
    expect(tx.apportionedCost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountPaise: 3100n, derivation: expect.objectContaining({ status: 'ACTUAL' }) }) }));
    expect(tx.allocationRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ALLOCATED' }) }));
  });
});
