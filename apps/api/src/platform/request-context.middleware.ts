import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestContext) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    const headers = request.headers;
    this.context.run(
      {
        userId: this.header(headers['x-user-id']),
        businessId: this.header(headers['x-business-id']),
        deviceId: this.header(headers['x-device-id']),
      },
      next,
    );
  }

  private header(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
