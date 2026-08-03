import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({ imports: [AuthorizationModule], controllers: [SyncController], providers: [SyncService] })
export class SyncModule {}
