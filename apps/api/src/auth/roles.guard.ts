import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

export type AuthRequest = Request & {
  user?: { role?: string; financialAccess?: boolean; pondScope?: string[] };
};

@Injectable()
export class FinancialAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.user?.financialAccess && request.user?.role !== 'AE_OWNER') {
      throw new ForbiddenException('Financial access is not enabled');
    }
    return true;
  }
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly roles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.user?.role || !this.roles.includes(request.user.role)) {
      throw new ForbiddenException('Role is not authorised');
    }
    return true;
  }
}

export const pondIsInScope = (pondId: string, scope: string[], role?: string): boolean =>
  role === 'AE_OWNER' || scope.includes('*') || scope.includes(pondId);
