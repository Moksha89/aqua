import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { AttachmentsService } from './attachments.service';

export class PresignAttachmentDto {
  @ApiProperty({ enum: ['EXPENSE', 'HARVEST', 'HEALTH'] })
  @IsIn(['EXPENSE', 'HARVEST', 'HEALTH'])
  ownerType!: 'EXPENSE' | 'HARVEST' | 'HEALTH';

  @ApiProperty()
  @IsUUID()
  ownerId!: string;

  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  contentType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25_000_000)
  sizeBytes?: number;
}

export class ConfirmAttachmentDto {
  @ApiProperty()
  @IsUUID()
  attachmentId!: string;
}

@UseGuards(JwtGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('presign')
  presign(@Body() body: PresignAttachmentDto, @Req() request: AuthenticatedRequest) {
    const user = request.user;
    if (!user?.businessId || !user.role) throw new BadRequestException('Business context required');
    return this.attachments.presign(body, {
      userId: user.id,
      deviceId: user.deviceId,
      businessId: user.businessId,
      role: user.role,
      financialAccess: user.financialAccess,
      pondScope: user.pondScope,
    });
  }

  @Post('confirm')
  confirm(@Body() body: ConfirmAttachmentDto, @Req() request: AuthenticatedRequest) {
    const user = request.user;
    if (!user?.businessId || !user.role) throw new BadRequestException('Business context required');
    return this.attachments.confirm(body, {
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
      financialAccess: user.financialAccess,
      pondScope: user.pondScope,
    });
  }
}
