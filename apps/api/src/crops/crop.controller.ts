import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt.guard';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CropService } from './crop.service';
import { JwtGuard } from '../auth/jwt.guard';

class BatchDto {
  @IsString() speciesId!: string;
  @IsString() stockedOn!: string;
  @IsString() quantityPieces!: string;
  @IsString() ratePaise!: string;
  @IsString() seedCostPaise = '0';
  @IsString() transportCostPaise = '0';
}
class StockDto {
  @IsString() speciesCategory!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => BatchDto) batches!: BatchDto[];
}
class PreparationDto {
  @IsString() name!: string;
  @IsString() startDate!: string;
  @IsString() labourCostPaise!: string;
  @IsString() materialCostPaise!: string;
  @IsString() amountPaise!: string;
  @IsOptional() @IsString() remarks?: string;
}

@UseGuards(JwtGuard)
@Controller('ponds')
export class CropController {
  constructor(private readonly crops: CropService) {}

  @Get(':id/water-readiness')
  readiness(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.crops.readiness(id, request.query.speciesId as string);
  }

  @Post(':id/stock')
  stock(@Param('id') id: string, @Body() body: StockDto, @Req() request: AuthenticatedRequest) {
    return this.crops.stock(id, body, {
      businessId: request.user!.businessId!,
      userId: request.user!.id,
      deviceId: request.user!.deviceId,
    });
  }

  @Get(':id/preparations')
  preparations(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.crops.preparations(id, request.user!.businessId!);
  }

  @Post(':id/preparations')
  createPreparation(@Param('id') id: string, @Body() body: PreparationDto, @Req() request: AuthenticatedRequest) {
    return this.crops.createPreparation(id, body, {
      businessId: request.user!.businessId!, userId: request.user!.id, deviceId: request.user!.deviceId,
    });
  }

  @Post('/crops/:cropId/stock-date')
  updateStockingDate(@Param('cropId') cropId: string, @Body('stockingDate') stockingDate: string, @Body('reason') reason: string, @Req() request: AuthenticatedRequest) {
    return this.crops.updateStockingDate(cropId, stockingDate, reason, {
      businessId: request.user!.businessId!, userId: request.user!.id, deviceId: request.user!.deviceId,
    });
  }
}
