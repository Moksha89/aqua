import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../platform/prisma.service';

type OtpEntry = { code: string; expiresAt: number };

@Injectable()
export class AuthService {
  private readonly otp = new Map<string, OtpEntry>();

  constructor(private readonly prisma: PrismaService) {}

  requestOtp(mobile: string): { mobile: string } {
    const code = randomInt(100000, 1000000).toString();
    this.otp.set(mobile, { code, expiresAt: Date.now() + 300_000 });
    console.info(`[dev-otp] ${mobile}: ${code}`);
    return { mobile };
  }

  async verifyOtp(
    mobile: string,
    code: string,
    deviceId: string,
  ): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    const entry = this.otp.get(mobile);
    const matches =
      entry !== undefined &&
      entry.code.length === code.length &&
      timingSafeEqual(Buffer.from(entry.code), Buffer.from(code));
    if (!entry || entry.expiresAt < Date.now() || !matches) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    this.otp.delete(mobile);
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
    return {
      userId: user.id,
      accessToken: this.token({ sub: user.id, deviceId, type: 'access' }),
      refreshToken: this.token({ sub: user.id, deviceId, type: 'refresh' }),
    };
  }

  private token(payload: Record<string, string>): string {
    const encoded = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 86_400_000 })).toString('base64url');
    const signature = createHmac('sha256', process.env.JWT_SECRET ?? 'development-secret')
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }
}
