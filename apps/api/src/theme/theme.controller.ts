import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { RoleGuard } from '../auth/roles.guard';
import { ThemeService } from './theme.service';

class ThemeDto {
  @ApiProperty({ type: Object })
  @IsObject()
  tokens!: Record<string, unknown>;
}

@UseGuards(JwtGuard)
@Controller('theme')
export class ThemeController {
  constructor(private readonly service: ThemeService) {}
  private ctx(r: AuthenticatedRequest) { return { businessId: r.user!.businessId!, userId: r.user!.id, deviceId: r.user!.deviceId }; }
  @Get()
  @ApiResponse({ status: 200, description: 'Active business theme' })
  get(@Req() r: AuthenticatedRequest) { return this.service.get(this.ctx(r)); }
  @Put()
  @UseGuards(new RoleGuard(['AE_OWNER', 'AE_ADMIN']))
  update(@Body() body: ThemeDto, @Req() r: AuthenticatedRequest) { return this.service.update(body.tokens, this.ctx(r)); }
  @Post('reset')
  @UseGuards(new RoleGuard(['AE_OWNER', 'AE_ADMIN']))
  reset(@Req() r: AuthenticatedRequest) { return this.service.reset(this.ctx(r)); }
}
