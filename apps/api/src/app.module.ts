import { Module } from '@nestjs/common';
import { MiddlewareConsumer } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CropModule } from './crops/crop.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { MastersModule } from './masters/masters.module';
import { AuditInterceptor } from './platform/audit.interceptor';
import { PrismaModule } from './platform/prisma.module';
import { RequestContextMiddleware } from './platform/request-context.middleware';
import { OperationsModule } from './operations/operations.module';
import { FinanceModule } from './finance/finance.module';
import { HarvestModule } from './harvest/harvest.module';
import { AllocationModule } from './allocation/allocation.module';
import { ThemeModule } from './theme/theme.module';
import { SyncModule } from './sync/sync.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ScrapModule } from './scrap/scrap.module';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, CropModule, AuthorizationModule, MastersModule, OperationsModule, FinanceModule, HarvestModule, AllocationModule, ThemeModule, SyncModule, AttachmentsModule, ScrapModule],
  providers: [AuditInterceptor],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
