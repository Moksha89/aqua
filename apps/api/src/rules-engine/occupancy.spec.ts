import { idleDayReconciliation, idleWindows, occupancyDays } from './index';

describe('occupancy and idle windows', () => {
  it('uses inclusive single-day and leap-year boundaries', () => {
    expect(occupancyDays(new Date('2024-02-29Z'), new Date('2024-02-29Z')).value).toBe(1n);
    expect(occupancyDays(new Date('2024-02-28Z'), new Date('2024-03-01Z')).value).toBe(3n);
  });
  it('reconciles two crop windows and idle days', () => {
    const idle = idleWindows(new Date('2024-01-01Z'), new Date('2024-12-31Z'), [
      { from: new Date('2024-01-10Z'), to: new Date('2024-03-09Z') },
      { from: new Date('2024-04-01Z'), to: new Date('2024-06-29Z') },
    ]);
    expect(idle.value?.reduce((sum, window) => sum + window.days, 0n)).toBe(216n);
    expect(idleDayReconciliation(366n, 60n + 90n, 216n).value).toBe(true);
  });
});
