import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export type RequestContextValue = {
  userId?: string;
  businessId?: string;
  deviceId?: string;
};

const storage = new AsyncLocalStorage<RequestContextValue>();

@Injectable()
export class RequestContext {
  run<T>(value: RequestContextValue, callback: () => T): T {
    return storage.run(value, callback);
  }

  get(): RequestContextValue {
    return storage.getStore() ?? {};
  }
}
