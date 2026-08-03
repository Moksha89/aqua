import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt.guard';
import { IsArray, IsString, ValidateNested } from 'class-validator';
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
}
