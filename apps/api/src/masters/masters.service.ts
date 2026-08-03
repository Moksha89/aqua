import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../platform/prisma.service';

const models = new Set([
  'farm', 'pond', 'leaseAgreement', 'species', 'feedItem', 'feedRateHistory',
  'medicineItem', 'medicineRateHistory', 'party', 'supplierCreditLimit', 'labour',
  'asset', 'costHead', 'preparationTemplate',
]);

@Injectable()
export class MastersService {
  constructor(private readonly prisma: PrismaService) {}

  private model(name: string): {
    findMany: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  } {
    if (!models.has(name)) throw new NotFoundException('Unknown master');
    return (this.prisma as unknown as Record<string, typeof this.prisma.farm>)[name] as never;
  }

  list(name: string, businessId: string): Promise<unknown> {
    return this.model(name).findMany({ where: { businessId, voidedAt: null } });
  }

  get(name: string, id: string, businessId: string): Promise<unknown> {
    return this.model(name).findUnique({ where: { id, businessId } });
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
    });
  }

  update(name: string, id: string, body: Record<string, unknown>, context: { businessId: string; userId: string }): Promise<unknown> {
    return this.model(name).update({
      where: { id, businessId: context.businessId },
      data: { ...body, updatedBy: context.userId },
    });
  }
}
