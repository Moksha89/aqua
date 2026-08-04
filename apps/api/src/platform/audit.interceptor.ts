import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(execution: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = execution.switchToHttp().getRequest<{ method: string }>();
    if (request.method === 'DELETE') throw new BadRequestException('Use the void operation; hard delete is forbidden');
    return next.handle();
  }
}
