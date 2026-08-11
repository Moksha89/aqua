import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

const challenge = {
  id: 'challenge-id',
  mobile: '9999900001',
  codeHash: 'actual-hash',
  purpose: 'LOGIN',
  expiresAt: new Date(Date.now() + 60_000),
  consumedAt: null,
  attemptCount: 0,
};

function prismaMock() {
  return {
    otpChallenge: { findFirst: jest.fn().mockResolvedValue(challenge), update: jest.fn().mockResolvedValue(challenge) },
    userAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'user-id' }), create: jest.fn() },
    refreshToken: { create: jest.fn().mockResolvedValue({ id: 'refresh-id' }) },
    userBusinessRole: { findFirst: jest.fn() },
    aeBusiness: { findUnique: jest.fn().mockResolvedValue({ name: 'Test Farm' }) },
  };
}

describe('AuthService fixed staging OTP', () => {
  const original = process.env.DEV_LOGIN_OTP;

  afterEach(() => {
    if (original === undefined) delete process.env.DEV_LOGIN_OTP;
    else process.env.DEV_LOGIN_OTP = original;
    jest.restoreAllMocks();
  });

  it('accepts the fixed OTP only when the challenge is valid', async () => {
    process.env.DEV_LOGIN_OTP = '246810';
    const prisma = prismaMock();
    const result = await new AuthService(prisma as never).verifyOtp('9999900001', '246810', 'device-id');
    expect(result.userId).toBe('user-id');
    expect(prisma.otpChallenge.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'challenge-id' },
      data: { consumedAt: expect.any(Date) },
    }));
  });

  it('keeps the normal generated-code behaviour when unset', async () => {
    delete process.env.DEV_LOGIN_OTP;
    const prisma = prismaMock();
    const service = new AuthService(prisma as never);
    await expect(service.verifyOtp('9999900001', '246810', 'device-id')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.otpChallenge.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { attemptCount: { increment: 1 } },
    }));
  });

  it('returns financial access for an owner business switch', async () => {
    delete process.env.DEV_LOGIN_OTP;
    const prisma = prismaMock();
    prisma.userBusinessRole = {
      findFirst: jest.fn().mockResolvedValue({ role: 'AE_OWNER', financialAccess: true, pondScope: ['*'] }),
    };
    await expect(new AuthService(prisma as never).switchBusiness('user-id', 'device-id', 'business-id')).resolves.toMatchObject({
      businessId: 'business-id',
      role: 'AE_OWNER',
      financialAccess: true,
      pondScope: ['*'],
    });
  });
});
