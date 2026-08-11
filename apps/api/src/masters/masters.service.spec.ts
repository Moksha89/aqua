import { BadRequestException } from '@nestjs/common';
import { MastersService } from './masters.service';

describe('MastersService lease extent validation', () => {
  it('rejects a lease extent greater than the attached pond', async () => {
    const service = new MastersService({
      pond: { findFirst: jest.fn().mockResolvedValue({ extentAcres: '2.0' }) },
    } as never, {} as never);

    await expect(service.validateLeaseExtent('business', 2.01, 'pond')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a lease extent equal to the attached pond', async () => {
    const service = new MastersService({
      pond: { findFirst: jest.fn().mockResolvedValue({ extentAcres: '2.0' }) },
    } as never, {} as never);

    await expect(service.validateLeaseExtent('business', 2, 'pond')).resolves.toBeUndefined();
  });
});
