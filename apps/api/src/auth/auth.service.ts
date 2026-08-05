import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../platform/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {
    if (process.env.DEV_LOGIN_OTP?.trim()) {
      console.warn('[auth] DEV_LOGIN_OTP is enabled; this staging-only login bypass must never be set in production');
    }
  }

  async requestOtp(mobile: string, deviceId?: string): Promise<{ mobile: string }> {
    const code = randomInt(100000, 1000000).toString();
    await this.prisma.otpChallenge.create({
      data: {
        mobile,
        codeHash: this.hash(code),
        purpose: 'LOGIN',
        expiresAt: new Date(Date.now() + 300_000),
        deviceId,
      },
    });
    console.info(`[dev-otp] ${mobile}: ${code}`);
    return { mobile };
  }

  async verifyOtp(
    mobile: string,
    code: string,
    deviceId: string,
  ): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    const entry = await this.prisma.otpChallenge.findFirst({
      where: { mobile, purpose: 'LOGIN', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!entry || entry.expiresAt < new Date() || entry.attemptCount >= 5) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    const expected = Buffer.from(entry.codeHash);
    const actual = Buffer.from(this.hash(code));
    const fixedOtp = process.env.DEV_LOGIN_OTP?.trim();
    const fixedMatches = Boolean(fixedOtp && code === fixedOtp);
    const matches = fixedMatches || (expected.length === actual.length && timingSafeEqual(expected, actual));
    if (!matches) {
      await this.prisma.otpChallenge.update({
        where: { id: entry.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.prisma.otpChallenge.update({
      where: { id: entry.id },
      data: { consumedAt: new Date() },
    });
    const existing = await this.prisma.userAccount.findUnique({ where: { mobile } });
    const user = existing ?? await this.prisma.userAccount.create({
      data: {
        mobile,
        name: mobile,
        defaultLanguage: 'en',
        status: 'ACTIVE',
        createdBy: deviceId,
        updatedBy: deviceId,
        deviceId,
      },
    });
    const refreshToken = randomBytes(32).toString('base64url');
    const refresh = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        deviceId,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
      },
    });
    return {
      userId: user.id,
      accessToken: this.token({ sub: user.id, deviceId, type: 'access' }),
      refreshToken: `${refresh.id}.${refreshToken}`,
    };
  }

  async refresh(presented: string): Promise<{ accessToken: string; refreshToken: string }> {
    const [id, raw] = presented.split('.');
    if (!id || !raw) throw new UnauthorizedException('Invalid refresh token');
    const current = await this.prisma.refreshToken.findUnique({ where: { id } });
    if (!current || current.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');
    if (current.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: current.userId, deviceId: current.deviceId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'REFRESH_REUSE_DETECTED' },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (this.hash(raw) !== current.tokenHash) throw new UnauthorizedException('Invalid refresh token');
    const nextRaw = randomBytes(32).toString('base64url');
    const next = await this.prisma.refreshToken.create({
      data: {
        userId: current.userId,
        deviceId: current.deviceId,
        tokenHash: this.hash(nextRaw),
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
      },
    });
    await this.prisma.refreshToken.update({
      where: { id: current.id },
      data: { revokedAt: new Date(), revokedReason: 'ROTATED', replacedById: next.id },
    });
    return {
      accessToken: this.token({ sub: current.userId, deviceId: current.deviceId, type: 'access' }),
      refreshToken: `${next.id}.${nextRaw}`,
    };
  }

  async registerDevice(userId: string, input: { deviceId: string; platform: string; pushToken?: string }) {
    return this.prisma.device.upsert({
      where: { id: input.deviceId },
      create: {
        id: input.deviceId,
        userId,
        platform: input.platform,
        pushToken: input.pushToken,
        createdBy: userId,
        updatedBy: userId,
        deviceId: input.deviceId,
      },
      update: { platform: input.platform, pushToken: input.pushToken, lastSeenAt: new Date() },
    });
  }

  async switchBusiness(userId: string, deviceId: string, businessId: string) {
    const role = await this.prisma.userBusinessRole.findFirst({
      where: { userId, businessId, voidedAt: null },
    });
    if (!role) throw new UnauthorizedException('User is not linked to this business');
    return {
      businessId,
      role: role.role,
      financialAccess: role.financialAccess,
      pondScope: role.pondScope,
      accessToken: this.token({ sub: userId, deviceId, businessId, type: 'access' }),
    };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private token(payload: Record<string, string>): string {
    const encoded = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 86_400_000 })).toString('base64url');
    const signature = createHmac('sha256', process.env.JWT_SECRET ?? 'development-secret')
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  verifyAccessToken(token: string): { sub: string; deviceId: string; businessId?: string } {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) throw new UnauthorizedException('Invalid access token');
    const expected = createHmac('sha256', process.env.JWT_SECRET ?? 'development-secret')
      .update(encoded)
      .digest('base64url');
    if (expected !== signature) throw new UnauthorizedException('Invalid access token');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as {
      sub?: string;
      deviceId?: string;
      businessId?: string;
      type?: string;
      exp?: number;
    };
    if (!payload.sub || !payload.deviceId || payload.type !== 'access' || !payload.exp || payload.exp < Date.now()) {
      throw new UnauthorizedException('Expired access token');
    }
    return { sub: payload.sub, deviceId: payload.deviceId, businessId: payload.businessId };
  }
}
