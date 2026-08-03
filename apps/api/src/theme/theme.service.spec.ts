import { BadRequestException } from '@nestjs/common';
import { DEFAULT_BUSINESS_THEME } from './theme.defaults';
import { ThemeService, validateTheme } from './theme.service';

describe('business theme', () => {
  it('rejects invalid hex colours', () => {
    expect(() => validateTheme({ ...DEFAULT_BUSINESS_THEME, primary: 'blue' })).toThrow(BadRequestException);
  });
  it('rejects partial token sets', () => {
    const partial = { ...DEFAULT_BUSINESS_THEME };
    delete (partial as Record<string, unknown>).danger;
    expect(() => validateTheme(partial)).toThrow('complete token set');
  });
  it('rejects failing contrast pairs', () => {
    expect(() => validateTheme({ ...DEFAULT_BUSINESS_THEME, textPrimary: '#FFFFFF', background: '#FFFFFF' })).toThrow('WCAG AA');
  });
  it('reset writes the exported defaults', async () => {
    const prisma = { businessTheme: { upsert: jest.fn().mockResolvedValue({ tokens: DEFAULT_BUSINESS_THEME }) } };
    await new ThemeService(prisma as never).reset({ businessId: 'b', userId: 'u', deviceId: 'd' });
    expect(prisma.businessTheme.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ tokens: DEFAULT_BUSINESS_THEME }) }));
  });
});
