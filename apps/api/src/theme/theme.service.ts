import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma.service';
import { BusinessThemeTokens, DEFAULT_BUSINESS_THEME } from './theme.defaults';

type Context = { businessId: string; userId: string; deviceId: string };
const HEX = /^#[0-9a-f]{6}$/i;
const REQUIRED = Object.keys(DEFAULT_BUSINESS_THEME) as (keyof BusinessThemeTokens)[];

const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

export const validateTheme = (tokens: unknown): BusinessThemeTokens => {
  if (!tokens || typeof tokens !== 'object') throw new BadRequestException('Theme tokens are required');
  const value = tokens as Record<string, unknown>;
  if (REQUIRED.some((key) => !(key in value))) throw new BadRequestException('Theme must contain the complete token set');
  for (const key of REQUIRED) {
    if (key === 'chartSeries') {
      if (!Array.isArray(value[key]) || value[key].length === 0 || value[key].some((item) => typeof item !== 'string' || !HEX.test(item))) throw new BadRequestException('Chart series must contain valid hex colours');
    } else if (typeof value[key] !== 'string' || !HEX.test(value[key] as string)) throw new BadRequestException(`Invalid hex colour for ${key}`);
  }
  const pairs: [keyof BusinessThemeTokens, keyof BusinessThemeTokens][] = [['onPrimary', 'primary'], ['onSecondary', 'secondary'], ['textPrimary', 'background'], ['textSecondary', 'background'], ['textPrimary', 'surface'], ['textSecondary', 'surface']];
  if (pairs.some(([foreground, background]) => contrast(value[foreground] as string, value[background] as string) < 4.5)) throw new BadRequestException('Theme colours fail WCAG AA contrast');
  return value as BusinessThemeTokens;
};

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}
  async get(ctx: Context) {
    const row = await this.prisma.businessTheme.findUnique({ where: { businessId: ctx.businessId } });
    return row ? { tokens: row.tokens, updatedAt: row.updatedAt, revision: row.rev } : { tokens: DEFAULT_BUSINESS_THEME, updatedAt: null, revision: 0n };
  }
  async update(tokens: unknown, ctx: Context) {
    const valid = validateTheme(tokens);
    return this.prisma.businessTheme.upsert({ where: { businessId: ctx.businessId }, update: { tokens: valid, updatedBy: ctx.userId, deviceId: ctx.deviceId, rev: { increment: 1n } }, create: { businessId: ctx.businessId, tokens: valid, createdBy: ctx.userId, updatedBy: ctx.userId, deviceId: ctx.deviceId } });
  }
  async reset(ctx: Context) { return this.update(DEFAULT_BUSINESS_THEME, ctx); }
}
