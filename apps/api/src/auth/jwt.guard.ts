import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../platform/prisma.service';
import { RequestContext } from '../platform/request-context';

export type AuthenticatedRequest = Request & {
  user?: { id: string; deviceId: string; businessId?: string; role?: string; financialAccess: boolean; pondScope: string[] };
};

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly context: RequestContext,
  ) {}

  async canActivate(execution: ExecutionContext): Promise<boolean> {
    const request = execution.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    const identity = this.auth.verifyAccessToken(header.slice(7));
    const businessId = request.headers['x-business-id']?.toString();
    const role = businessId
      ? await this.prisma.userBusinessRole.findFirst({
          where: { userId: identity.sub, businessId, voidedAt: null },
        })
      : null;
    request.user = {
      id: identity.sub,
      deviceId: identity.deviceId,
      businessId,
      role: role?.role,
      financialAccess: role?.financialAccess ?? false,
      pondScope: role?.pondScope ?? [],
    };
    this.context.set({ userId: identity.sub, deviceId: identity.deviceId, businessId });
    return true;
  }
}
