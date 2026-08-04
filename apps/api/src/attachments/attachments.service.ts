import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { PrismaService } from '../platform/prisma.service';
import type { ScopeUser } from '../authorization/query-scope';
import type { PresignAttachmentDto } from './attachments.controller';

const REGION = process.env.S3_REGION ?? 'us-east-1';
const BUCKET = process.env.S3_BUCKET ?? 'aqua-attachments';

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}
function signingKey(secret: string, date: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), REGION), 's3'), 'aws4_request');
}
function encodedPath(key: string): string {
  return `/${BUCKET}/${key.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
}

@Injectable()
export class AttachmentsService {
  private readonly endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
  private readonly accessKey = process.env.S3_ACCESS_KEY ?? 'aqua';
  private readonly secretKey = process.env.S3_SECRET_KEY ?? 'aqua-secret';

  constructor(private readonly prisma: PrismaService) {}

  async presign(body: PresignAttachmentDto, user: ScopeUser & { deviceId: string }) {
    const owner = await this.findOwner(body.ownerType, body.ownerId, user.businessId);
    if (!owner) throw new NotFoundException('Attachment owner was not found');
    if (!body.contentType.startsWith('image/') && body.ownerType !== 'HEALTH') {
      throw new BadRequestException('Only image attachments are accepted for this record');
    }
    const fileName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160);
    const key = `${user.businessId}/${body.ownerType.toLowerCase()}/${body.ownerId}/${randomUUID()}-${fileName}`;
    await this.ensureBucket();
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
    if (body.ownerType === 'EXPENSE') {
      await this.prisma.expense.update({ where: { id: body.ownerId }, data: { billKey: key, updatedBy: user.userId } });
    } else if (body.ownerType === 'HEALTH') {
      await this.prisma.healthEvent.update({ where: { id: body.ownerId }, data: { labReportKey: key, updatedBy: user.userId } });
    }
    return { attachmentId: attachment.id, key, uploadUrl: this.presignedUrl('PUT', key, body.contentType) };
  }

  private async findOwner(type: PresignAttachmentDto['ownerType'], id: string, businessId: string) {
    if (type === 'EXPENSE') return this.prisma.expense.findFirst({ where: { id, businessId, voidedAt: null }, select: { id: true } });
    if (type === 'HARVEST') return this.prisma.harvestEvent.findFirst({ where: { id, businessId, voidedAt: null }, select: { id: true } });
    return this.prisma.healthEvent.findFirst({ where: { id, businessId, voidedAt: null }, select: { id: true } });
  }

  private presignedUrl(method: string, key: string, contentType: string): string {
    const endpoint = new URL(this.endpoint);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = amzDate.slice(0, 8);
    const credential = `${this.accessKey}/${date}/${REGION}/s3/aws4_request`;
    const path = encodedPath(key);
    const query: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': '900',
      'X-Amz-SignedHeaders': 'content-type;host',
    };
    const canonicalQuery = Object.keys(query).sort().map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(query[name]!)}`).join('&');
    const host = endpoint.host;
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
    const canonicalRequest = [method, path, canonicalQuery, canonicalHeaders, 'content-type;host', 'UNSIGNED-PAYLOAD'].join('\n');
    const scope = `${date}/${REGION}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hash(canonicalRequest)].join('\n');
    query['X-Amz-Signature'] = createHmac('sha256', signingKey(this.secretKey, date)).update(stringToSign).digest('hex');
    const signedQuery = Object.keys(query).sort().map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(query[name]!)}`).join('&');
    return `${endpoint.origin}${path}?${signedQuery}`;
  }

  private async ensureBucket(): Promise<void> {
    const endpoint = new URL(this.endpoint);
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const day = date.slice(0, 8);
    const path = `/${BUCKET}`;
    const host = endpoint.host;
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${hash('')}\nx-amz-date:${date}\n`;
    const canonicalRequest = ['PUT', path, '', canonicalHeaders, 'host;x-amz-content-sha256;x-amz-date', hash('')].join('\n');
    const scope = `${day}/${REGION}/s3/aws4_request`;
    const auth = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${createHmac('sha256', signingKey(this.secretKey, day)).update(['AWS4-HMAC-SHA256', date, scope, hash(canonicalRequest)].join('\n')).digest('hex')}`;
    const response = await fetch(`${endpoint.origin}${path}`, { method: 'PUT', headers: { host, 'x-amz-content-sha256': hash(''), 'x-amz-date': date, authorization: auth } });
    if (!response.ok && response.status !== 409 && response.status !== 400) throw new BadRequestException('Attachment storage is unavailable');
  }
}
