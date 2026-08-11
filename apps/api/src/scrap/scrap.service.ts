import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScrapSale } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/jwt.guard';
import { PrismaService } from '../platform/prisma.service';
import { QueryScope } from '../authorization/query-scope';

type Input = { saleDate: string; item: string; quantity: number; ratePaise: string; cropId?: string; pondId?: string; buyerPartyId?: string };

@Injectable()
export class ScrapService {
  constructor(private readonly prisma: PrismaService, private readonly scope: QueryScope) {}

  private context(request: AuthenticatedRequest) {
    return { userId: request.user!.id, businessId: request.user!.businessId!, role: request.user!.role!, financialAccess: request.user!.financialAccess, pondScope: request.user!.pondScope, deviceId: request.user!.deviceId };
  }

  async list(request: AuthenticatedRequest) {
    const ctx = this.context(request);
    this.scope.assertFinancial(ctx);
    const rows = await this.prisma.scrapSale.findMany({ where: { businessId: ctx.businessId, voidedAt: null }, orderBy: { saleDate: 'desc' } });
    return this.filterPonds(rows, ctx);
  }

  async create(body: Input, request: AuthenticatedRequest) {
    const ctx = this.context(request);
    this.scope.assertFinancial(ctx);
    if (body.pondId) this.scope.assertPondScope(ctx, body.pondId);
    if (body.cropId) {
      const crop = await this.prisma.crop.findFirst({ where: { id: body.cropId, businessId: ctx.businessId, voidedAt: null } });
      if (!crop) throw new NotFoundException('Crop not found');
      this.scope.assertPondScope(ctx, crop.pondId);
    }
    const rate = BigInt(body.ratePaise);
    const quantityText = String(body.quantity);
    if (!/^\d+(?:\.\d{1,3})?$/.test(quantityText)) throw new Error('Quantity must have up to three decimal places');
    const [whole, fraction = ''] = quantityText.split('.');
    const quantityThousandths = BigInt(`${whole}${fraction.padEnd(3, '0')}`);
    const amount = (quantityThousandths * rate + 500n) / 1000n;
    return this.prisma.scrapSale.create({ data: {
      businessId: ctx.businessId, cropId: body.cropId, pondId: body.pondId, saleDate: new Date(body.saleDate),
      item: body.item, quantity: new Prisma.Decimal(body.quantity), ratePaise: rate, buyerPartyId: body.buyerPartyId,
      amountPaise: amount, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId,
    } });
  }

  private async filterPonds(rows: ScrapSale[], ctx: ReturnType<ScrapService['context']>) {
    if (ctx.role !== 'AE_OPERATOR' || ctx.pondScope.includes('*')) return rows;
    const pondIds = new Set(ctx.pondScope);
    const crops = await this.prisma.crop.findMany({ where: { id: { in: rows.flatMap((row) => row.cropId ? [row.cropId] : []) }, businessId: ctx.businessId }, select: { id: true, pondId: true } });
    const cropPonds = new Map(crops.map((crop) => [crop.id, crop.pondId]));
    return rows.filter((row) => (!row.pondId || pondIds.has(row.pondId)) && (!row.cropId || pondIds.has(cropPonds.get(row.cropId) ?? '')));
  }
}
