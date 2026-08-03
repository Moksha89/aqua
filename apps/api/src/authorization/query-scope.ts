import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma.service';
import { Prisma } from '@prisma/client';

export type ScopeUser = {
  userId: string;
  businessId: string;
  role: string;
  financialAccess: boolean;
  pondScope: string[];
};

@Injectable()
export class QueryScope {
  constructor(private readonly prisma: PrismaService) {}

  assertFinancial(user: ScopeUser): void {
    if (user.role !== 'AE_OWNER' && !user.financialAccess) {
      throw new ForbiddenException('Financial access is not enabled');
    }
  }

  pondWhere(user: ScopeUser, pondId?: string): Prisma.PondWhereInput {
    if (pondId && user.role === 'OPERATOR' && !user.pondScope.includes('*') && !user.pondScope.includes(pondId)) {
      throw new ForbiddenException('Pond is outside assigned scope');
    }
    return {
      businessId: user.businessId,
      ...(user.role === 'OPERATOR' && !user.pondScope.includes('*')
      ? { pondId: { in: user.pondScope } }
        : pondId ? { pondId } : {}),
    };
  }
}
