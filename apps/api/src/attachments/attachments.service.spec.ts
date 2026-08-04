import { BadRequestException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AttachmentsService } from './attachments.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const user = {
  userId: '11111111-1111-4111-8111-111111111111',
  deviceId: '22222222-2222-4222-8222-222222222222',
  businessId: '33333333-3333-4333-8333-333333333333',
  role: 'AE_OWNER' as const,
  financialAccess: true,
  pondScope: ['*'],
};

describe('AttachmentsService', () => {
  const send = jest.spyOn(S3Client.prototype, 'send');
  const signedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

  beforeAll(() => {
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.S3_ACCESS_KEY = 'test-access';
    process.env.S3_SECRET_KEY = 'test-secret';
  });

  beforeEach(() => {
    send.mockResolvedValue({} as never);
    signedUrl.mockResolvedValue('http://localhost:9000/upload');
  });

  afterAll(() => {
    send.mockRestore();
  });

  it('creates a pending attachment without linking the owner', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'attachment-id' });
    const expenseUpdate = jest.fn();
    const prisma = {
      expense: { findFirst: jest.fn().mockResolvedValue({ id: 'expense-id' }), update: expenseUpdate },
      attachment: { create },
    } as never;
    const service = new AttachmentsService(prisma);
    const result = await service.presign(
      {
        ownerType: 'EXPENSE',
        ownerId: '44444444-4444-4444-8444-444444444444',
        fileName: 'bill.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 4,
      },
      user,
    );
    expect(result.uploadUrl).toBe('http://localhost:9000/upload');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ objectKey: expect.stringContaining('/expense/') }),
      }),
    );
    expect(expenseUpdate).not.toHaveBeenCalled();
  });

  it('confirms storage before linking an expense', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'attachment-id', status: 'UPLOADED' });
    const expenseUpdate = jest.fn();
    const prisma = {
      attachment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'attachment-id',
          businessId: user.businessId,
          ownerType: 'EXPENSE',
          ownerId: 'expense-id',
          objectKey: 'business/expense/object.jpg',
          voidedAt: null,
        }),
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          attachment: { update },
          expense: { update: expenseUpdate },
        }),
      ),
    } as never;
    const service = new AttachmentsService(prisma);
    await service.confirm({ attachmentId: 'attachment-id' }, user);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'UPLOADED' }) }),
    );
    expect(expenseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ billKey: 'business/expense/object.jpg' }) }),
    );
  });

  it('rejects confirmation when the object is absent', async () => {
    (send as jest.Mock).mockRejectedValueOnce(new Error('NotFound'));
    const prisma = {
      attachment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'attachment-id',
          businessId: user.businessId,
          ownerType: 'EXPENSE',
          ownerId: 'expense-id',
          objectKey: 'missing.jpg',
          voidedAt: null,
        }),
      },
    } as never;
    const service = new AttachmentsService(prisma);
    await expect(service.confirm({ attachmentId: 'attachment-id' }, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
