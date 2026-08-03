import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../platform/prisma.service';
import { Prisma } from '@prisma/client';
import { QueryScope, ScopeUser } from '../authorization/query-scope';

const models = new Set([
  'farm', 'pond', 'leaseAgreement', 'species', 'feedItem', 'feedRateHistory',
  'medicineItem', 'medicineRateHistory', 'party', 'supplierCreditLimit', 'labour',
  'asset', 'costHead', 'preparationTemplate',
]);

@Injectable()
export class MastersService {
  constructor(private readonly prisma: PrismaService, private readonly scope: QueryScope) {}

  private model(name: string): {
    findMany: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  } {
    if (!models.has(name)) throw new NotFoundException('Unknown master');
    return (this.prisma as unknown as Record<string, typeof this.prisma.farm>)[name] as never;
  }

  list(name: string, user: ScopeUser): Promise<unknown> {
    if (['leaseAgreement', 'supplierCreditLimit', 'asset', 'costHead'].includes(name)) this.scope.assertFinancial(user);
    const where = name === 'pond' ? this.scope.pondWhere(user) : { businessId: user.businessId, voidedAt: null };
    return this.model(name).findMany({ where });
  }

  get(name: string, id: string, user: ScopeUser): Promise<unknown> {
    if (['leaseAgreement', 'supplierCreditLimit', 'asset', 'costHead'].includes(name)) this.scope.assertFinancial(user);
    const where = name === 'pond'
      ? { id, ...this.scope.pondWhere(user) }
      : { id, businessId: user.businessId };
    return this.model(name).findUnique({ where });
  }

  create(name: string, body: Record<string, unknown>, context: { businessId: string; userId: string; deviceId: string }): Promise<unknown> {
    return this.model(name).create({
      data: {
        ...body,
        id: body.id ?? randomUUID(),
        businessId: context.businessId,
        createdBy: context.userId,
        updatedBy: context.userId,
        deviceId: context.deviceId,
      },
    }).then(async (after) => {
      const entityId = (after as { id: string }).id;
      await this.prisma.auditLog.create({
        data: {
          businessId: context.businessId, entity: name, entityId, action: 'CREATE',
          userId: context.userId, deviceId: context.deviceId, at: new Date(),
          before: Prisma.JsonNull, after: after as never, createdBy: context.userId, updatedBy: context.userId,
        },
      });
      return after;
    });
  }

  update(name: string, id: string, body: Record<string, unknown>, context: { businessId: string; userId: string }): Promise<unknown> {
    const delegate = this.model(name);
    return delegate.findUnique({ where: { id, businessId: context.businessId } }).then(async (before) => {
      const after = await delegate.update({
      where: { id, businessId: context.businessId },
      data: { ...body, updatedBy: context.userId },
      });
      await this.prisma.auditLog.create({
        data: {
          businessId: context.businessId, entity: name, entityId: id, action: 'UPDATE',
          userId: context.userId, deviceId: context.userId, at: new Date(),
          before: before as never, after: after as never, createdBy: context.userId, updatedBy: context.userId,
        },
      });
      return after;
    });
  }
}
