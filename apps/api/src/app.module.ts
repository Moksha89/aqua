import { Module } from '@nestjs/common';
import { MiddlewareConsumer } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CropModule } from './crops/crop.module';
import { PrismaModule } from './platform/prisma.module';
import { RequestContextMiddleware } from './platform/request-context.middleware';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, CropModule],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
