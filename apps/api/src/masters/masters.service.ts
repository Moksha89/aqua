import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../platform/prisma.service';
import { QueryScope, ScopeUser } from '../authorization/query-scope';

export type MasterContext = { businessId: string; userId: string; deviceId: string };
export type Delegate = {
  findMany(args: unknown): Promise<unknown>;
  findUnique(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

@Injectable()
export class MastersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: QueryScope,
  ) {}

  get farm(): Delegate { return this.prisma.farm; }
  get pond(): Delegate { return this.prisma.pond; }
  get leaseAgreement(): Delegate { return this.prisma.leaseAgreement; }
  get species(): Delegate { return this.prisma.species; }
  get feedItem(): Delegate { return this.prisma.feedItem; }
  get feedRateHistory(): Delegate { return this.prisma.feedRateHistory; }
  get medicineItem(): Delegate { return this.prisma.medicineItem; }
  get medicineRateHistory(): Delegate { return this.prisma.medicineRateHistory; }
  get party(): Delegate { return this.prisma.party; }
  get supplierCreditLimit(): Delegate { return this.prisma.supplierCreditLimit; }
  get labour(): Delegate { return this.prisma.labour; }
  get asset(): Delegate { return this.prisma.asset; }
  get costHead(): Delegate { return this.prisma.costHead; }
  get preparationTemplate(): Delegate { return this.prisma.preparationTemplate; }

  list(delegate: Delegate, user: ScopeUser, pond = false, financial = false): Promise<unknown> {
    if (financial) this.scope.assertFinancial(user);
    return delegate.findMany({
      where: pond ? this.scope.pondWhere(user) : { businessId: user.businessId, voidedAt: null },
    });
  }

  get(delegate: Delegate, id: string, user: ScopeUser, pond = false, financial = false): Promise<unknown> {
    if (financial) this.scope.assertFinancial(user);
    return delegate.findUnique({
      where: pond ? { id, ...this.scope.pondWhere(user) } : { id, businessId: user.businessId },
    });
  }

  async create(delegate: Delegate, data: Record<string, unknown>, context: MasterContext): Promise<unknown> {
    const after = await delegate.create({
      data: {
        ...data,
        businessId: context.businessId,
        createdBy: context.userId,
        updatedBy: context.userId,
        deviceId: context.deviceId,
      },
    });
    await this.audit(context, (after as { id: string }).id, 'CREATE', Prisma.JsonNull, after);
    return after;
  }

  async update(delegate: Delegate, id: string, data: Record<string, unknown>, context: MasterContext): Promise<unknown> {
    const before = await delegate.findUnique({ where: { id, businessId: context.businessId } });
    const after = await delegate.update({
      where: { id, businessId: context.businessId },
      data: { ...data, updatedBy: context.userId },
    });
    await this.audit(context, id, 'UPDATE', before, after);
    return after;
  }

  private audit(context: MasterContext, entityId: string, action: string, before: unknown, after: unknown): Promise<unknown> {
    return this.prisma.auditLog.create({
      data: {
        businessId: context.businessId,
        entity: 'master',
        entityId,
        action,
        userId: context.userId,
        deviceId: context.deviceId,
        at: new Date(),
        before: before as never,
        after: after as never,
        createdBy: context.userId,
        updatedBy: context.userId,
      },
    });
  }
}
