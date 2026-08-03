import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { SyncPullQueryDto, SyncPushDto } from './sync.dto';
import { SyncService } from './sync.service';

@UseGuards(JwtGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly service: SyncService) {}
  private user(r: AuthenticatedRequest) { return { userId: r.user!.id, businessId: r.user!.businessId!, role: r.user!.role!, financialAccess: r.user!.financialAccess, pondScope: r.user!.pondScope, deviceId: r.user!.deviceId }; }
  @Get('pull')
  @ApiResponse({ status: 200, description: 'Paged changes and active theme' })
  pull(@Query() query: SyncPullQueryDto, @Req() request: AuthenticatedRequest) { return this.service.pull(query.since, query.limit, this.user(request)); }
  @Post('push')
  @ApiBody({ type: SyncPushDto })
  push(@Req() request: AuthenticatedRequest, @Body() body: SyncPushDto) { return this.service.push(body, this.user(request)); }
}
