import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/platform/prisma.service';
import { AppModule } from '../src/app.module';
import { JsonSerialiserInterceptor } from '../src/platform/json-serialiser.interceptor';
import { createHmac, randomUUID } from 'node:crypto';
import request = require('supertest');

describe('authorization and stocking invariants (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const actor = randomUUID();
  const device = randomUUID();
  const businessA = randomUUID();
  const businessB = randomUUID();
  const user = randomUUID();
  const farmA = randomUUID();
  const pondA = randomUUID();
  const pondOther = randomUUID();
  const farmB = randomUUID();
  const pondB = randomUUID();

  const token = (businessId: string, role = 'OPERATOR', financialAccess = false, scope: string[] = [pondA]) => {
    const encoded = Buffer.from(JSON.stringify({
      sub: user, deviceId: device, businessId, type: 'access', role, financialAccess, pondScope: scope,
      exp: Date.now() + 86_400_000,
    })).toString('base64url');
    const signature = createHmac('sha256', process.env.JWT_SECRET ?? 'development-secret')
      .update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalInterceptors(new JsonSerialiserInterceptor());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "audit_log", "crop_species_line", "stocking_batch", "preparation_activity",
        "crop", "pond", "farm", "cost_head", "user_business_role", "user_account",
        "ae_business", "device"
      CASCADE
    `);
    await prisma.aeBusiness.createMany({
      data: [
        { id: businessA, name: 'A', language: 'en', createdBy: actor, updatedBy: actor, deviceId: device },
        { id: businessB, name: 'B', language: 'en', createdBy: actor, updatedBy: actor, deviceId: device },
      ],
    });
    await prisma.userAccount.create({
      data: { id: user, mobile: `9${Date.now()}`, name: 'Operator', defaultLanguage: 'en', status: 'ACTIVE', createdBy: actor, updatedBy: actor, deviceId: device },
    });
    await prisma.userBusinessRole.create({
      data: { businessId: businessA, userId: user, role: 'OPERATOR', financialAccess: false, pondScope: [pondA], createdBy: actor, updatedBy: actor, deviceId: device },
    });
    await prisma.farm.createMany({
      data: [
        { id: farmA, businessId: businessA, name: 'Farm A', electricityServiceNumbers: [], createdBy: actor, updatedBy: actor, deviceId: device },
        { id: farmB, businessId: businessB, name: 'Farm B', electricityServiceNumbers: [], createdBy: actor, updatedBy: actor, deviceId: device },
      ],
    });
    await prisma.pond.createMany({
      data: [
        { id: pondA, businessId: businessA, farmId: farmA, code: 'A1', name: 'A1', extentAcres: '1', ownershipType: 'OWN', status: 'IDLE', createdBy: actor, updatedBy: actor, deviceId: device },
        { id: pondOther, businessId: businessA, farmId: farmA, code: 'A2', name: 'A2', extentAcres: '1', ownershipType: 'OWN', status: 'IDLE', createdBy: actor, updatedBy: actor, deviceId: device },
        { id: pondB, businessId: businessB, farmId: farmB, code: 'B1', name: 'B1', extentAcres: '1', ownershipType: 'OWN', status: 'IDLE', createdBy: actor, updatedBy: actor, deviceId: device },
      ],
    });
    await prisma.costHead.create({
      data: { id: randomUUID(), businessId: businessA, code: 'X', name: 'Financial', classification: 'DIRECT', createdBy: actor, updatedBy: actor, deviceId: device },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks an operator from financial entities', async () => {
    await request(app.getHttpServer()).get('/masters/cost-heads')
      .set('Authorization', `Bearer ${token(businessA)}`).expect(403);
  });

  it('does not return another pond outside operator scope', async () => {
    const response = await request(app.getHttpServer()).get('/masters/ponds')
      .set('Authorization', `Bearer ${token(businessA)}`).expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(pondA);
    await request(app.getHttpServer()).get(`/masters/ponds/${pondOther}`)
      .set('Authorization', `Bearer ${token(businessA)}`).expect(403);
  });

  it('ignores a forged business header', async () => {
    const response = await request(app.getHttpServer()).get('/masters/ponds')
      .set('Authorization', `Bearer ${token(businessA)}`)
      .set('x-business-id', businessB).expect(200);
    expect(response.body.every((pond: { businessId: string }) => pond.businessId === businessA)).toBe(true);
  });

  it('rolls back a failed stocking transaction', async () => {
    await request(app.getHttpServer()).post(`/ponds/${pondA}/stock`)
      .set('Authorization', `Bearer ${token(businessA, 'AE_OWNER', true, ['*'])}`)
      .send({
        speciesCategory: 'SHRIMP',
        batches: [{ speciesId: randomUUID(), stockedOn: 'not-a-date', quantityPieces: '100', ratePaise: '10' }],
      }).expect(500);
    expect(await prisma.crop.count({ where: { pondId: pondA } })).toBe(0);
    expect((await prisma.pond.findUniqueOrThrow({ where: { id: pondA } })).status).toBe('IDLE');
    expect(await prisma.preparationActivity.count({ where: { pondId: pondA, cropId: { not: null } } })).toBe(0);
  });

  it('starts occupancy at the earliest preparation activity', async () => {
    const speciesId = randomUUID();
    await prisma.species.create({
      data: { id: speciesId, category: 'SHRIMP', name: `Vannamei-${speciesId}`, createdBy: actor, updatedBy: actor, deviceId: device },
    });
    await prisma.preparationActivity.create({
      data: {
        businessId: businessA, pondId: pondOther, name: 'Pond preparation', startDate: new Date('2026-07-20'),
        labourCostPaise: 0n, materialCostPaise: 0n, amountPaise: 0n, createdBy: actor, updatedBy: actor, deviceId: device,
      },
    });
    const response = await request(app.getHttpServer()).post(`/ponds/${pondOther}/stock`)
      .set('Authorization', `Bearer ${token(businessA, 'AE_OWNER', true, ['*'])}`)
      .send({
        speciesCategory: 'SHRIMP',
        batches: [{ speciesId, stockedOn: '2026-08-01', quantityPieces: '100', ratePaise: '10' }],
      }).expect(201);
    const crop = await prisma.crop.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(crop.preparationStartDate.toISOString()).toBe('2026-07-20T00:00:00.000Z');
  });

  it('completes the Phase-1 lifecycle through frozen P&L', async () => {
    const speciesId = randomUUID();
    const feedItemId = randomUUID();
    const costHeadId = randomUUID();
    await prisma.species.create({ data: { id: speciesId, category: 'SHRIMP', name: `Lifecycle-${speciesId}`, createdBy: actor, updatedBy: actor, deviceId: device } });
    await prisma.feedItem.create({ data: { id: feedItemId, businessId: businessA, brand: 'Lifecycle', feedType: 'STARTER', gradeCode: 'S1', bagWeightKg: '25', createdBy: actor, updatedBy: actor, deviceId: device } });
    await prisma.feedRateHistory.create({ data: { id: randomUUID(), businessId: businessA, feedItemId, effectiveFrom: new Date('2026-01-01'), ratePerKgPaise: 100n, createdBy: actor, updatedBy: actor, deviceId: device } });
    await prisma.costHead.create({ data: { id: costHeadId, businessId: businessA, code: `L-${costHeadId}`, name: 'Lifecycle expense', classification: 'DIRECT', createdBy: actor, updatedBy: actor, deviceId: device } });
    await prisma.preparationActivity.create({ data: { businessId: businessA, pondId: pondA, name: 'Lifecycle prep', startDate: new Date('2026-07-01'), labourCostPaise: 0n, materialCostPaise: 0n, amountPaise: 0n, createdBy: actor, updatedBy: actor, deviceId: device } });
    const auth = { Authorization: `Bearer ${token(businessA, 'AE_OWNER', true, ['*']) }` };
    const stocked = await request(app.getHttpServer()).post(`/ponds/${pondA}/stock`).set(auth).send({ speciesCategory: 'SHRIMP', batches: [{ speciesId, stockedOn: '2026-07-10', quantityPieces: '1000', ratePaise: '10' }] }).expect(201);
    const cropId = stocked.body.id;
    await request(app.getHttpServer()).post(`/crops/${cropId}/feed-logs`).set(auth).send({ logDate: '2026-07-11', mealSlot: 'MORNING', feedItemId, quantityKg: '1' }).expect(201);
    await request(app.getHttpServer()).post(`/crops/${cropId}/growth-samples`).set(auth).send({ sampledOn: '2026-08-01', doc: 22, animalsInSample: 10, sampleWeightG: '1' }).expect(201);
    await request(app.getHttpServer()).post('/finance/expenses').set(auth).send({ expenseDate: '2026-07-11', costHeadId, allocationTarget: 'POND_CROP', pondId: pondA, cropId, amountPaise: '1000' }).expect(201);
    await request(app.getHttpServer()).post(`/crops/${cropId}/harvests`).set(auth).send({ harvestDate: '2026-08-10', doc: 31, type: 'PARTIAL', reason: 'MARKET_RATE', sampleTaken: true, sampleCount: 10, sampleWeightG: '1.2', lines: [{ basis: 'COUNT', key: 'ALL', quantityKg: '0.5', ratePerKgPaise: '200' }] }).expect(201);
    await request(app.getHttpServer()).post(`/crops/${cropId}/harvests`).set(auth).send({ harvestDate: '2026-09-10', doc: 62, type: 'FINAL', reason: 'SEASON_END', sampleTaken: true, sampleCount: 10, sampleWeightG: '1.5', lines: [{ basis: 'COUNT', key: 'ALL', quantityKg: '0.5', ratePerKgPaise: '200' }] }).expect(201);
    await request(app.getHttpServer()).post(`/crops/${cropId}/closure-checklist`).set(auth).expect(201);
    for (const step of ['CONFIRM_HARVESTS', 'ZERO_COST_HEADS', 'RECONCILE_FEED_STOCK', 'POST_OCCUPANCY_COSTS', 'CLOSURE_ALLOCATION']) {
      await request(app.getHttpServer()).post(`/crops/${cropId}/closure-checklist/${step}`).set(auth).send({ note: step === 'RECONCILE_FEED_STOCK' ? 'CARRY_FORWARD' : step === 'ZERO_COST_HEADS' ? 'ACK_ZERO:all-reviewed' : 'complete' }).expect(201);
    }
    const pnl = await request(app.getHttpServer()).post(`/crops/${cropId}/close`).set(auth).expect(201);
    expect(pnl.body.isCurrent).toBe(true);
    expect(pnl.body.payload.status).toBe('FROZEN');
    const crop = await prisma.crop.findUniqueOrThrow({ where: { id: cropId } });
    expect(crop.preparationStartDate.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(crop.status).toBe('CLOSED');
    expect((await prisma.pond.findUniqueOrThrow({ where: { id: pondA } })).status).toBe('IDLE');
  });

  it('computes the lease allocation through HTTP', async () => {
    const leaseId = randomUUID();
    const cropId = randomUUID();
    await prisma.leaseAgreement.create({ data: { id: leaseId, businessId: businessA, landlordName: 'BPD landlord', extentAcres: '1', ratePerAcrePerAnnumPaise: 66200n, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), paymentFrequency: 'ANNUAL', advancePaise: 0n, advanceRefundable: false, createdBy: actor, updatedBy: actor, deviceId: device } });
    await prisma.pond.update({ where: { id: pondA }, data: { leaseAgreementId: leaseId } });
    await prisma.crop.create({ data: { id: cropId, businessId: businessA, pondId: pondA, code: `ALLOC-${cropId}`, speciesCategory: 'SHRIMP', status: 'ACTIVE', preparationStartDate: new Date('2026-01-01'), stockingDate: new Date('2026-01-01'), survivalAssumptionPct: '0', feedLoggingEnabled: true, createdBy: actor, updatedBy: actor, deviceId: device } });
    await request(app.getHttpServer()).post('/allocations/runs').set('Authorization', `Bearer ${token(businessA, 'AE_OWNER', true, ['*'])}`).send({ periodStart: '2026-01-01', periodEnd: '2026-12-31', trigger: 'MONTH_END' }).expect(201);
    const row = await prisma.apportionedCost.findFirstOrThrow({ where: { cropId, kind: 'LEASE' }, orderBy: { createdAt: 'desc' } });
    expect(row.amountPaise).toBe(66065n);
    expect((row.derivation as { status: string }).status).toBe('ACTUAL');
  });

  it('reproduces the BPD ₹66,200 worked example through HTTP allocation', async () => {
    const leaseId = randomUUID();
    const cropId = randomUUID();
    const aeratorId = randomUUID();
    const generatorId = randomUUID();
    const extraPonds = [randomUUID(), randomUUID()];
    await prisma.pond.createMany({ data: extraPonds.map((id, index) => ({ id, businessId: businessA, farmId: farmA, code: `EX${index}`, name: `Extra ${index}`, extentAcres: '1', ownershipType: 'OWN', status: 'IDLE', createdBy: actor, updatedBy: actor, deviceId: device })) });
    await prisma.leaseAgreement.create({ data: { id: leaseId, businessId: businessA, landlordName: 'Worked example', extentAcres: '2', ratePerAcrePerAnnumPaise: 6000000n, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), paymentFrequency: 'ANNUAL', advancePaise: 0n, advanceRefundable: false, createdBy: actor, updatedBy: actor, deviceId: device } });
    await prisma.pond.update({ where: { id: pondA }, data: { leaseAgreementId: leaseId } });
    await prisma.asset.createMany({ data: [
      { id: aeratorId, businessId: businessA, name: 'Aerators', category: 'AERATOR', pondId: pondA, purchaseDate: new Date('2024-01-01'), costPaise: 36000000n, salvagePct: '5', usefulLifeYears: '7', createdBy: actor, updatedBy: actor, deviceId: device },
      { id: generatorId, businessId: businessA, name: 'Generator', category: 'GENERATOR', purchaseDate: new Date('2024-01-01'), costPaise: 45000000n, salvagePct: '10', usefulLifeYears: '10', createdBy: actor, updatedBy: actor, deviceId: device },
    ] });
    await prisma.crop.create({ data: { id: cropId, businessId: businessA, pondId: pondA, code: `BPD-${cropId}`, speciesCategory: 'SHRIMP', status: 'ACTIVE', preparationStartDate: new Date('2025-01-01'), stockingDate: new Date('2025-01-01'), survivalAssumptionPct: '0', feedLoggingEnabled: true, createdBy: actor, updatedBy: actor, deviceId: device } });
    await request(app.getHttpServer()).post('/allocations/runs').set('Authorization', `Bearer ${token(businessA, 'AE_OWNER', true, ['*'])}`).send({ periodStart: '2025-01-01', periodEnd: '2025-05-15', trigger: 'MONTH_END' }).expect(201);
    const rows = await prisma.apportionedCost.findMany({ where: { cropId }, orderBy: { kind: 'asc' } });
    expect(rows.find((row) => row.kind === 'LEASE')?.amountPaise).toBe(4438395n);
    expect(rows.find((row) => row.kind === 'DEPRECIATION' && row.costHeadId === aeratorId)?.amountPaise).toBe(1807110n);
    expect(rows.find((row) => row.kind === 'DEPRECIATION' && row.costHeadId === generatorId)?.amountPaise).toBe(374490n);
    expect(rows.filter((row) => row.kind !== 'COMMON').reduce((sum, row) => sum + row.amountPaise, 0n)).toBe(6619995n);
  });
});
