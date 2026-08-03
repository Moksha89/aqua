import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from './prisma.service';
import { RequestContext } from './request-context';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService, private readonly context: RequestContext) {}

  intercept(execution: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = execution.switchToHttp().getRequest<{ method: string; body: unknown; params: Record<string, string>; url: string }>();
    if (request.method === 'DELETE') throw new BadRequestException('Use the void operation; hard delete is forbidden');
    const before = request.method === 'PATCH' ? request.body : null;
    return next.handle().pipe(
      tap((after) => {
        const context = this.context.get();
        if (!context.businessId || !context.userId || !context.deviceId ||
            !uuid.test(context.businessId) || !uuid.test(context.userId) || !uuid.test(context.deviceId)) return;
        const entity = request.url.split('/').filter(Boolean).at(-2) ?? 'request';
        const entityId = request.params.id;
        if (!entityId || !uuid.test(entityId)) return;
        void this.prisma.auditLog.create({
          data: {
            businessId: context.businessId,
            entity,
            entityId,
            action: request.method === 'PATCH' ? 'UPDATE' : 'CREATE',
            userId: context.userId,
            deviceId: context.deviceId,
            at: new Date(),
            before: before as never,
            after: after as never,
            createdBy: context.userId,
            updatedBy: context.userId,
          },
        });
      }),
    );
  }
}
