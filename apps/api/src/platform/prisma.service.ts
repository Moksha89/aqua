import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    this.$use(async (params, next) => {
      if ((params.action === 'delete' || params.action === 'deleteMany') &&
          !['OtpChallenge', 'RefreshToken'].includes(params.model ?? '')) {
        throw new Error('Hard deletes are forbidden; use the void operation');
      }
      return next(params);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
