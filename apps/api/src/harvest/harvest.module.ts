import { Module } from '@nestjs/common';
import { HarvestController } from './harvest.controller';
import { HarvestService } from './harvest.service';
import { AllocationModule } from '../allocation/allocation.module';
@Module({ imports: [AllocationModule], controllers: [HarvestController], providers: [HarvestService] })
export class HarvestModule {}
