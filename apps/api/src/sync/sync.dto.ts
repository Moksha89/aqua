import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsObject, IsOptional, IsString, IsUUID, Max, Min, IsInt } from 'class-validator';

export class SyncRecordDto {
  @ApiProperty({ enum: ['feedLog', 'waterReading', 'expense'] })
  @IsIn(['feedLog', 'waterReading', 'expense', 'growthSample', 'checkTrayReading', 'medicineApplication', 'healthEvent', 'attendanceLog', 'payment', 'harvestEvent', 'harvestLine', 'preparationActivity'])
  entity!: 'feedLog' | 'waterReading' | 'expense' | 'growthSample' | 'checkTrayReading' | 'medicineApplication' | 'healthEvent' | 'attendanceLog' | 'payment' | 'harvestEvent' | 'harvestLine' | 'preparationActivity';
  @ApiProperty()
  @IsUUID()
  id!: string;
  @ApiProperty()
  @IsString()
  idempotencyKey!: string;
  @ApiProperty({ type: Object })
  @IsObject()
  payload!: Record<string, unknown>;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  clientRev?: number;
}

export class SyncPushDto {
  @ApiProperty({ type: [SyncRecordDto] })
  @IsArray()
  records!: SyncRecordDto[];
}

export class SyncPullQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  since?: string;
  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 100;
}
