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
      where: pond ? this.scope.pondWhere(user) : { OR: [{ businessId: user.businessId }, { businessId: null }], voidedAt: null },
    });
  }

  get(delegate: Delegate, id: string, user: ScopeUser, pond = false, financial = false): Promise<unknown> {
    if (financial) this.scope.assertFinancial(user);
    return delegate.findUnique({
      where: pond ? this.scope.pondWhere(user, id) : { id, OR: [{ businessId: user.businessId }, { businessId: null }] },
    });
  }

  async create(delegate: Delegate, data: object, context: MasterContext): Promise<unknown> {
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

  async createLease(data: Record<string, unknown>, context: MasterContext): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const lease = await tx.leaseAgreement.create({
        data: { ...data, businessId: context.businessId, createdBy: context.userId, updatedBy: context.userId, deviceId: context.deviceId } as Prisma.LeaseAgreementUncheckedCreateInput,
      });
      const start = new Date(data.startDate as Date);
      const end = new Date(data.endDate as Date);
      const frequency = String(data.paymentFrequency).toUpperCase();
      if (frequency === 'CUSTOM') {
        const rows = (data.customSchedule as Array<{ dueDate: string; amountPaise: string }> | undefined) ?? [];
        await tx.leasePaymentSchedule.createMany({
          data: rows.map((row) => ({
            businessId: context.businessId, leaseAgreementId: lease.id, dueDate: new Date(row.dueDate),
            amountPaise: BigInt(row.amountPaise), status: 'DUE', createdBy: context.userId,
            updatedBy: context.userId, deviceId: context.deviceId,
          })),
        });
        return lease;
      }
      const months = frequency === 'HALF_YEARLY' ? 6 : 12;
      const periods: Date[] = [];
      for (const due = new Date(start); due <= end; due.setMonth(due.getMonth() + months)) periods.push(new Date(due));
      // Escalation is retained for audit/history; v1 schedule generation does not apply it.
      const annual = new Prisma.Decimal(String(data.ratePerAcrePerAnnumPaise)).mul(String(data.extentAcres));
      const amount = BigInt(annual.div(Math.max(1, 12 / months)).toFixed(0));
      await tx.leasePaymentSchedule.createMany({
        data: periods.map((dueDate) => ({
          businessId: context.businessId, leaseAgreementId: lease.id, dueDate, amountPaise: amount,
          status: 'DUE', createdBy: context.userId, updatedBy: context.userId, deviceId: context.deviceId,
        })),
      });
      await tx.auditLog.create({
        data: { businessId: context.businessId, entity: 'leaseAgreement', entityId: lease.id, action: 'CREATE',
          userId: context.userId, deviceId: context.deviceId, at: new Date(), before: Prisma.JsonNull,
          after: lease as never, createdBy: context.userId, updatedBy: context.userId },
      });
      return lease;
    });
  }

  async update(delegate: Delegate, id: string, data: object, context: MasterContext): Promise<unknown> {
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
