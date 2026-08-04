import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContext } from './request-context';

@Global()
@Module({
  providers: [PrismaService, RequestContext],
  exports: [PrismaService, RequestContext],
})
export class PrismaModule {}
