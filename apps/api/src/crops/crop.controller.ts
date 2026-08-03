import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
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
  readiness(@Param('id') id: string, @Headers('x-species-id') speciesId: string) {
    return this.crops.readiness(id, speciesId);
  }

  @Post(':id/stock')
  stock(@Param('id') id: string, @Body() body: StockDto, @Headers() headers: Record<string, string>) {
    return this.crops.stock(id, body, {
      businessId: headers['x-business-id'] ?? '',
      userId: headers['x-user-id'] ?? '',
      deviceId: headers['x-device-id'] ?? '',
    });
  }
}
