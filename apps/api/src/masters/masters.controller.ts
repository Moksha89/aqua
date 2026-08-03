import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { MastersService } from './masters.service';

@UseGuards(JwtGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly masters: MastersService) {}

  @Get(':entity')
  list(@Param('entity') entity: string, @Headers('x-business-id') businessId: string) {
    return this.masters.list(entity, businessId);
  }

  @Get(':entity/:id')
  get(@Param('entity') entity: string, @Param('id') id: string, @Headers('x-business-id') businessId: string) {
    return this.masters.get(entity, id, businessId);
  }

  @Post(':entity')
  create(@Param('entity') entity: string, @Body() body: Record<string, unknown>, @Headers() headers: Record<string, string>) {
    return this.masters.create(entity, body, {
      businessId: headers['x-business-id'] ?? '',
      userId: headers['x-user-id'] ?? '',
      deviceId: headers['x-device-id'] ?? '',
    });
  }

  @Patch(':entity/:id')
  update(@Param('entity') entity: string, @Param('id') id: string, @Body() body: Record<string, unknown>, @Headers() headers: Record<string, string>) {
    return this.masters.update(entity, id, body, {
      businessId: headers['x-business-id'] ?? '',
      userId: headers['x-user-id'] ?? '',
    });
  }
}
