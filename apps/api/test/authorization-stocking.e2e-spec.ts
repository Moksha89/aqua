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
});
