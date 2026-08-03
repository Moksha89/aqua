import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestContext) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    this.context.run(
      {
        userId: undefined,
        businessId: undefined,
        deviceId: undefined,
      },
      next,
    );
  }

  private header(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
