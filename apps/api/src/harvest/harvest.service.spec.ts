import { HarvestService } from './harvest.service';

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
      pond: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn((fn: (value: typeof tx) => unknown) => fn(tx)) };
    const service = new HarvestService(prisma as never);
    const result = await service.close('crop', { businessId: 'business', userId: 'user', deviceId: 'device' });
    expect(result).toEqual({ id: 'new', version: 3, isCurrent: true });
    expect(tx.cropPnl.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: { isCurrent: false } });
    expect(tx.cropPnl.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ version: 3, isCurrent: true }) }));
    expect(tx.crop.update).toHaveBeenCalled();
    expect(tx.pond.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'pond' }, data: expect.objectContaining({ status: 'IDLE' }) }));
  });

  it('rejects writes to a closed crop', async () => {
    const prisma = { $transaction: jest.fn((fn: (value: unknown) => unknown) => fn({ crop: { findFirst: jest.fn().mockResolvedValue({ status: 'CLOSED' }) } })) };
    const service = new HarvestService(prisma as never);
    await expect(service.harvest('crop', { harvestDate: '2026-01-01', doc: 1, type: 'FINAL', reason: 'OTHER', sampleTaken: false, lines: [{ basis: 'GRADE', key: 'A', quantityKg: '1', ratePerKgPaise: '100' }] }, { businessId: 'business', userId: 'user', deviceId: 'device' })).rejects.toThrow('Closed crops are read-only');
  });
});
