import {
  depreciationDailyRate,
  depreciationForWindow,
  leaseCost,
  leaseDailyRate,
  paise,
  bp,
  acres1e4,
} from './index';

describe('daily cost accrual', () => {
  it('serialises bigint and Date inputs in cost derivations', () => {
    const derivation = leaseDailyRate(paise(6_000_000n), acres1e4(20_000n));
    expect(() => JSON.stringify(derivation)).not.toThrow();
    expect(JSON.parse(JSON.stringify(derivation)).derivation.inputs.annual).toBe('6000000');
  });
  it('matches the worked example with daily paise posting', () => {
    const lease = leaseCost(paise(6_000_000n), acres1e4(20_000n), 135n);
    const aerators = depreciationForWindow(
      {
        costPaise: paise(36_000_000n),
        salvagePct: bp(500n),
        usefulLifeYears: 7n,
        purchaseDate: new Date('2024-01-01Z'),
      },
      new Date('2025-01-01Z'),
      new Date('2025-05-15Z'),
    );
    const generatorDaily = depreciationDailyRate({
      costPaise: paise(45_000_000n),
      salvagePct: bp(1_000n),
      usefulLifeYears: 10n,
      purchaseDate: new Date('2024-01-01Z'),
    });
    expect(leaseDailyRate(paise(6_000_000n), acres1e4(20_000n)).value).toBe(32_877n);
    expect(lease.value).toBe(4_438_395n);
    expect(aerators.value).toBe(1_807_110n);
    expect(generatorDaily.value).toBe(11_096n);
    expect((generatorDaily.value! / 4n) * 135n).toBe(374_490n);
    expect(Math.round(Number(lease.value! + aerators.value! + 374_490n) / 100)).toBe(66_200);
  });
  it('supports purchase cutoffs, disposal cutoffs, and repair accrual', () => {
    const asset = {
      costPaise: paise(1_000_000n),
      salvagePct: bp(0n),
      usefulLifeYears: 10n,
      purchaseDate: new Date('2025-02-01Z'),
      disposalDate: new Date('2025-02-10Z'),
      underRepair: true,
    };
    expect(
      depreciationForWindow(asset, new Date('2025-01-01Z'), new Date('2025-02-20Z')).value,
    ).toBe(depreciationDailyRate(asset).value! * 10n);
  });
});
