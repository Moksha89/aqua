import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AllocationService } from './allocation/allocation.service';
import { HarvestService } from './harvest/harvest.service';
import { MastersService } from './masters/masters.service';
import { ScrapService } from './scrap/scrap.service';
import { FinanceService } from './finance/finance.service';
import { UserRole } from './auth/roles';

const user = (businessId: string, financialAccess = true) => ({
  userId: 'user',
  businessId,
  role: UserRole.OWNER,
  financialAccess,
  pondScope: ['*'],
  deviceId: 'device',
});

describe('financial gap read scoping', () => {
  it.each(['events', 'checklistRead', 'frozenPnl'])('rejects %s for a crop in another business', async (method) => {
    const prisma = {
      crop: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new HarvestService(prisma as never, {} as never, { assertPondScope: jest.fn() } as never);
    await expect((service as never as Record<string, (...args: unknown[]) => Promise<unknown>>)[method]!('crop', user('business-b'))).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.crop.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ businessId: 'business-b' }) }));
  });

  it('scopes the closed-crop archive to the caller business', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new HarvestService({ crop: { findMany } } as never, {} as never, {} as never);
    await expect(service.closed(user('business-b'), 'CLOSED')).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: 'business-b', status: 'CLOSED', voidedAt: null } }));
  });

  it('scopes market rates and rejects callers without financial access', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const assertFinancial = jest.fn((ctx) => {
      if (!ctx.financialAccess) throw new ForbiddenException('Financial access is not enabled');
    });
    const service = new MastersService({ marketRateReference: { findMany } } as never, { assertFinancial } as never);
    await expect(service.list(service.marketRateReference, user('business-b'), false, true, true)).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ businessId: 'business-b' }, { businessId: null }] }) }));
    expect(() => service.list(service.marketRateReference, user('business-b', false), false, true, true)).toThrow(ForbiddenException);
  });

  it('scopes scrap sales and rejects callers without financial access', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const assertFinancial = jest.fn((ctx) => {
      if (!ctx.financialAccess) throw new ForbiddenException('Financial access is not enabled');
    });
    const service = new ScrapService({ scrapSale: { findMany } } as never, { assertFinancial } as never);
    const request = { user: { ...user('business-b'), role: UserRole.OWNER } };
    await expect(service.list(request as never)).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: 'business-b', voidedAt: null } }));
    await expect(service.list({ user: { ...user('business-b', false), role: UserRole.OPERATOR } } as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects scrap creation when the crop belongs to another business', async () => {
    const cropFindFirst = jest.fn().mockResolvedValue(null);
    const service = new ScrapService({ crop: { findFirst: cropFindFirst } } as never, { assertFinancial: jest.fn(), assertPondScope: jest.fn() } as never);
    await expect(service.create({ saleDate: '2026-01-01', item: 'used net', quantity: 1, ratePaise: '100', cropId: 'crop-b' }, { user: { ...user('business-b'), role: UserRole.OWNER } } as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(cropFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ businessId: 'business-b' }) }));
  });

  it('rejects allocation derivation for a run in another business', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new AllocationService({ allocationRun: { findFirst } } as never);
    await expect(service.derivation('run-a', { businessId: 'business-b', role: 'AE_OWNER', pondScope: ['*'] })).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'run-a', businessId: 'business-b' } });
  });

  it('returns server-derived insights scoped to one business', async () => {
    const aggregate = jest.fn()
      .mockResolvedValueOnce({ _sum: { netRealisationPaise: 1000n } })
      .mockResolvedValueOnce({ _sum: { amountPaise: 400n } })
      .mockResolvedValueOnce({ _sum: { amountPaise: 100n } });
    const prisma = {
      harvestEvent: { aggregate, findFirst: jest.fn().mockResolvedValue(null) },
      expense: { aggregate, count: jest.fn().mockResolvedValue(2) },
      apportionedCost: { aggregate },
      crop: { count: jest.fn().mockResolvedValue(1) },
    };
    const service = new FinanceService(prisma as never);
    const result = await service.insights({ businessId: 'business-b', userId: 'user', deviceId: 'device' });
    expect(result.figures).toEqual({ revenuePaise: 1000n, costPaise: 500n, netProfitPaise: 500n });
    expect(aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ businessId: 'business-b' }) }));
  });

  it('keeps insight totals equal to the business P&L totals', async () => {
    const makePrisma = () => ({
      harvestEvent: { aggregate: jest.fn().mockResolvedValue({ _sum: { netRealisationPaise: 1000n } }), findFirst: jest.fn().mockResolvedValue(null) },
      expense: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountPaise: 400n } }), count: jest.fn().mockResolvedValue(0) },
      apportionedCost: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountPaise: 100n } }) },
      crop: { count: jest.fn().mockResolvedValue(1) },
    });
    const ctx = { businessId: 'business-b', userId: 'user', deviceId: 'device' };
    const pnl = await new FinanceService(makePrisma() as never).businessPnl(ctx);
    const insights = await new FinanceService(makePrisma() as never).insights(ctx);
    expect(pnl).toEqual({ revenuePaise: 1000n, costPaise: 500n, netProfitPaise: 500n });
    expect(insights.figures).toEqual(pnl);
  });

  it('materialises all closure steps as pending without writing rows', async () => {
    const checklistFindMany = jest.fn().mockResolvedValue([]);
    const service = new HarvestService({ crop: { findFirst: jest.fn().mockResolvedValue({ id: 'crop', pondId: 'pond' }), }, cropClosureChecklist: { findMany: checklistFindMany } } as never, {} as never, { assertPondScope: jest.fn() } as never);
    const result = await service.checklistRead('crop', user('business-b'));
    expect(result).toHaveLength(6);
    expect(result.every((step) => step.status === 'PENDING')).toBe(true);
    expect(checklistFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: 'business-b', cropId: 'crop', voidedAt: null } }));
  });

  it('scopes allocation history to the caller business', async () => {
    const findManyRuns = jest.fn().mockResolvedValue([]);
    const service = new AllocationService({
      allocationRun: { findMany: findManyRuns },
      crop: { findMany: jest.fn().mockResolvedValue([]) },
      pond: { findMany: jest.fn().mockResolvedValue([]) },
      apportionedCost: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountPaise: null } }), count: jest.fn().mockResolvedValue(0) },
    } as never);
    await expect(service.runs({ businessId: 'business-b', role: 'AE_OWNER', pondScope: ['*'] })).resolves.toEqual([]);
    expect(findManyRuns).toHaveBeenCalledWith({ where: { businessId: 'business-b' }, orderBy: { createdAt: 'desc' } });
  });
});
