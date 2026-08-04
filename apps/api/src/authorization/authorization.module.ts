import { Global, Module } from '@nestjs/common';
import { QueryScope } from './query-scope';

@Global()
@Module({ providers: [QueryScope], exports: [QueryScope] })
export class AuthorizationModule {}
