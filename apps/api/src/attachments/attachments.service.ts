import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../platform/prisma.service';
import type { ScopeUser } from '../authorization/query-scope';
import type {
  ConfirmAttachmentDto,
  PresignAttachmentDto,
} from './attachments.controller';

const REGION = process.env.S3_REGION ?? 'us-east-1';
const BUCKET = process.env.S3_BUCKET ?? 'aqua-attachments';

@Injectable()
export class AttachmentsService implements OnModuleInit {
  private readonly s3: S3Client;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY are required',
      );
    }
    this.s3 = new S3Client({
      endpoint,
      region: REGION,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    } catch (error) {
      const code = (error as { name?: string }).name;
      if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
        throw error;
      }
    }
  }

  async presign(
    body: PresignAttachmentDto,
    user: ScopeUser & { deviceId: string },
  ) {
    const owner = await this.findOwner(
      body.ownerType,
      body.ownerId,
      user.businessId,
    );
    if (!owner) throw new NotFoundException('Attachment owner was not found');
    if (!body.contentType.startsWith('image/') && body.ownerType !== 'HEALTH') {
      throw new BadRequestException(
        'Only image attachments are accepted for this record',
      );
    }
    const fileName = body.fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 160);
    const key = `${user.businessId}/${body.ownerType.toLowerCase()}/${body.ownerId}/${randomUUID()}-${fileName}`;
    const attachment = await this.prisma.attachment.create({
      data: {
        businessId: user.businessId,
        ownerType: body.ownerType,
        ownerId: body.ownerId,
        objectKey: key,
        fileName,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
        createdBy: user.userId,
        deviceId: user.deviceId,
      },
    });
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: body.contentType,
      }),
      { expiresIn: 900 },
    );
    return { attachmentId: attachment.id, key, uploadUrl };
  }

  async confirm(body: ConfirmAttachmentDto, user: ScopeUser) {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: body.attachmentId,
        businessId: user.businessId,
        voidedAt: null,
      },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: attachment.objectKey }),
      );
    } catch {
      throw new BadRequestException(
        'Attachment upload was not found in storage',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.attachment.update({
        where: { id: attachment.id },
        data: { status: 'UPLOADED', uploadedAt: new Date() },
      });
      if (attachment.ownerType === 'EXPENSE') {
        await tx.expense.update({
          where: { id: attachment.ownerId },
          data: { billKey: attachment.objectKey, updatedBy: user.userId },
        });
      } else if (attachment.ownerType === 'HEALTH') {
        await tx.healthEvent.update({
          where: { id: attachment.ownerId },
          data: { labReportKey: attachment.objectKey, updatedBy: user.userId },
        });
      }
      return updated;
    });
  }

  private async findOwner(
    type: PresignAttachmentDto['ownerType'],
    id: string,
    businessId: string,
  ) {
    if (type === 'EXPENSE') {
      return this.prisma.expense.findFirst({
        where: { id, businessId, voidedAt: null },
        select: { id: true },
      });
    }
    if (type === 'HARVEST') {
      return this.prisma.harvestEvent.findFirst({
        where: { id, businessId, voidedAt: null },
        select: { id: true },
      });
    }
    return this.prisma.healthEvent.findFirst({
      where: { id, businessId, voidedAt: null },
      select: { id: true },
    });
  }
}
