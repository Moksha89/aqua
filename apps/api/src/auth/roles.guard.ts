import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from './roles';

export type AuthRequest = Request & {
  user?: { role?: UserRole; financialAccess?: boolean; pondScope?: string[] };
};

@Injectable()
export class FinancialAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.user?.financialAccess && request.user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Financial access is not enabled');
    }
    return true;
  }
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly roles: UserRole[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.user?.role || !this.roles.includes(request.user.role)) {
      throw new ForbiddenException('Role is not authorised');
    }
    return true;
  }
}

export const pondIsInScope = (pondId: string, scope: string[], role?: string): boolean =>
  role === UserRole.OWNER || scope.includes('*') || scope.includes(pondId);
