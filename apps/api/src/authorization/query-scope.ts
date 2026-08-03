import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma.service';
import { Prisma } from '@prisma/client';
import { UserRole } from '../auth/roles';

export type ScopeUser = {
  userId: string;
  businessId: string;
  role: UserRole;
  financialAccess: boolean;
  pondScope: string[];
};

@Injectable()
export class QueryScope {
  constructor(private readonly prisma: PrismaService) {}

  assertFinancial(user: ScopeUser): void {
    if (user.role !== UserRole.OWNER && !user.financialAccess) {
      throw new ForbiddenException('Financial access is not enabled');
    }
  }

  assertPondScope(user: ScopeUser, pondId: string): void {
    if (user.role === UserRole.OPERATOR && !user.pondScope.includes('*') && !user.pondScope.includes(pondId)) {
      throw new ForbiddenException('Pond is outside assigned scope');
    }
  }

  pondWhere(user: ScopeUser, pondId?: string): Prisma.PondWhereInput {
    if (pondId) this.assertPondScope(user, pondId);
    return {
      businessId: user.businessId,
      ...(pondId
        ? { id: pondId }
        : user.role === UserRole.OPERATOR && !user.pondScope.includes('*')
          ? { id: { in: user.pondScope } }
          : {}),
    };
  }
}
