import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { ScopeUser } from '../authorization/query-scope';
import { MastersService } from './masters.service';

@UseGuards(JwtGuard)
@Controller('masters')
export class MastersController {
  constructor(private readonly masters: MastersService) {}

  private user(request: AuthenticatedRequest): ScopeUser {
    const user = request.user!;
    return {
      userId: user.id,
      businessId: user.businessId!,
      role: user.role ?? 'OPERATOR',
      financialAccess: user.financialAccess,
      pondScope: user.pondScope,
    };
  }

  @Get(':entity')
  list(@Param('entity') entity: string, @Req() request: AuthenticatedRequest) {
    return this.masters.list(entity, this.user(request));
  }

  @Get(':entity/:id')
  get(@Param('entity') entity: string, @Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.masters.get(entity, id, this.user(request));
  }

  @Post(':entity')
  create(@Param('entity') entity: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest) {
    return this.masters.create(entity, body, {
      businessId: request.user!.businessId!,
      userId: request.user!.id,
      deviceId: request.user!.deviceId,
    });
  }

  @Patch(':entity/:id')
  update(@Param('entity') entity: string, @Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest) {
    return this.masters.update(entity, id, body, {
      businessId: request.user!.businessId!,
      userId: request.user!.id,
    });
  }
}
