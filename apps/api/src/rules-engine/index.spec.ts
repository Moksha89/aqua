import {
  actualSurvival,
  commonAllocation,
  depreciationCost,
  harvestAbw,
  leaseCost,
  occupancyDays,
  pnl,
} from './index';

describe('rules engine worked example', () => {
  it('calculates occupancy, lease and generator share in integer paise', () => {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const harvest = new Date('2025-05-15T00:00:00.000Z');
    expect(occupancyDays(start, harvest).value).toBe(135);
    expect(leaseCost(6_000_000n, 2n, 135n).value).toBe(4_438_356n);
    expect(depreciationCost(4_500_000n * 8n, 5n, 7n, 135n).value).toBe(1_807_045n);
    expect(depreciationCost(45_000_000n, 10n, 10n, 135n).value).toBe(1_497_945n);
    expect(depreciationCost(45_000_000n, 10n, 10n, 135n).value! / 4n).toBe(374_486n);
  });
});

describe('rules engine edge cases', () => {
  it('uses actual occupancy boundaries and handles disposal and mid-crop purchase', () => {
    expect(occupancyDays(new Date('2025-03-01Z'), new Date('2025-03-02Z')).value).toBe(2);
    expect(depreciationCost(1_000_000n, 0n, 10n, 31n).value).toBe(8_493n);
  });

  it('allocates common cost by basis and active days', () => {
    expect(commonAllocation({
      commonCostPaise: 100_000n,
      basisValue: 2n,
      totalBasisValue: 4n,
      activeDays: 15n,
      daysInPeriod: 30n,
    }).value).toBe(25_000n);
  });

  it('marks skipped harvest samples as not determinable', () => {
    expect(harvestAbw(false, 100n, 10n).status).toBe('NOT_DETERMINABLE');
    expect(actualSurvival(100n, 10n, 1_000n).value).toBe(1_000n);
  });

  it('returns the complete P&L layout', () => {
    const result = pnl({
      grossRevenuePaise: 1_000n,
      directCostsPaise: 300n,
      timeApportionedPaise: 200n,
      harvestedKg: 10n,
      pondAcres: 2n,
    });
    expect(result.revenue!.value).toBe(1_000n);
    expect(result.grossMargin!.value).toBe(700n);
    expect(result.netProfit!.value).toBe(500n);
    expect(result.costPerKg!.value).toBe(50n);
  });
});
