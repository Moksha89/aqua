import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { FinancialAccessGuard } from '../auth/roles.guard';
import { ScrapService } from './scrap.service';

class ScrapSaleDto {
  @IsString() saleDate!: string;
  @IsString() item!: string;
  @IsNumber() quantity!: number;
  @IsString() ratePaise!: string;
  @IsOptional() @IsString() cropId?: string;
  @IsOptional() @IsString() pondId?: string;
  @IsOptional() @IsString() buyerPartyId?: string;
}

@UseGuards(JwtGuard, FinancialAccessGuard)
@Controller('finance/scrap-sales')
export class ScrapController {
  constructor(private readonly scrap: ScrapService) {}
  @Get() list(@Req() request: AuthenticatedRequest) { return this.scrap.list(request); }
  @Post() create(@Body() body: ScrapSaleDto, @Req() request: AuthenticatedRequest) { return this.scrap.create(body, request); }
}
