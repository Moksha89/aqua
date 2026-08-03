import {
  breakEvenRatePerKg,
  commonAllocation,
  costPerKg,
  costPerThousandSeed,
  feedCostPct,
  feedCostPerKg,
  grossHarvestValue,
  marginPerKg,
  netRealisation,
  paise,
  pnl,
  powerCostPerKg,
  realisedAverageRatePerKg,
  seedCostPerThousand,
  totalHarvestedWeight,
  valueInput,
  weightedAverageRate,
  weightG,
} from './index';

describe('valuation, allocation, harvest and P&L', () => {
  it('serialises bigint inputs in financial derivations', () => {
    const derivation = grossHarvestValue([{ quantityG: weightG(1_000n), ratePaise: paise(200n) }]);
    expect(() => JSON.stringify(derivation)).not.toThrow();
    expect(JSON.parse(JSON.stringify(derivation)).derivation.inputs.lines[0].ratePaise).toBe('200');
  });
  it('uses the three-step valuation fallback and preserves weighted average', () => {
    expect(
      weightedAverageRate([
        { quantity: 10n, ratePaise: paise(100n) },
        { quantity: 10n, ratePaise: paise(300n) },
      ]).value,
    ).toBe(200n);
    expect(valueInput([], paise(500n)).rate.status).toBe('ESTIMATED');
    expect(valueInput([]).ratePending).toBe(true);
    expect(
      weightedAverageRate([{ quantity: 10n, ratePaise: paise(100n) }], paise(999n)).value,
    ).toBe(100n);
  });
  it('allocates by active days for equal and extent bases', () => {
    expect(
      commonAllocation({
        commonCostPaise: paise(100_000n),
        basisValue: 1n,
        totalBasisValue: 2n,
        activeDays: 15n,
        daysInPeriod: 30n,
      }).value,
    ).toBe(25_000n);
    expect(
      commonAllocation({
        commonCostPaise: paise(100_000n),
        basisValue: 2n,
        totalBasisValue: 5n,
        activeDays: 30n,
        daysInPeriod: 30n,
      }).value,
    ).toBe(40_000n);
  });
  it('values harvest, deductions and a balanced full P&L', () => {
    const lines = [
      { quantityG: weightG(1_000_000n), ratePaise: paise(200n) },
      { quantityG: weightG(500_000n), ratePaise: paise(300n) },
    ];
    expect(totalHarvestedWeight(lines).value).toBe(1_500_000n);
    expect(grossHarvestValue(lines).value).toBe(350_000n);
    expect(netRealisation(paise(350_000n), paise(20_000n)).value).toBe(330_000n);
    const result = pnl({
      harvestSales: paise(350_000n),
      harvestCosts: paise(20_000n),
      otherIncome: paise(5_000n),
      directCosts: {
        seed: paise(50_000n),
        feed: paise(100_000n),
        medicine: paise(10_000n),
        labour: paise(20_000n),
        electricity: paise(15_000n),
        diesel: paise(5_000n),
        maintenance: paise(5_000n),
        misc: paise(0n),
        preparation: paise(10_000n),
        inputs: paise(0n),
        harvest: paise(0n),
        other: paise(0n),
      },
      lease: paise(30_000n),
      depreciation: paise(20_000n),
      allocatedCommon: paise(10_000n),
      harvestedWeightG: weightG(1_500_000n),
      feedCost: paise(100_000n),
      electricity: paise(15_000n),
      diesel: paise(5_000n),
      gensetRent: paise(0n),
    });
    expect(
      result.totalRevenueA!.value! -
        result.totalDirectCostsB!.value! -
        result.totalApportionedC!.value!,
    ).toBe(result.netProfit!.value);
    expect(result.kpis.costPerKg.value).toBe(183n);
    expect(result.kpis.feedCostPct.value).toBe(3_636n);
    expect(realisedAverageRatePerKg(paise(350_000n), weightG(1_500_000n)).value).toBe(233n);
    expect(costPerKg(paise(100_000n), weightG(1_500_000n)).value).toBe(67n);
    expect(marginPerKg(paise(350_000n), paise(100_000n), weightG(1_500_000n)).value).toBe(166n);
    expect(feedCostPct(paise(100_000n), paise(250_000n)).value).toBe(4_000n);
    expect(feedCostPerKg(paise(100_000n), weightG(1_500_000n)).value).toBe(67n);
    expect(
      powerCostPerKg(paise(20_000n), paise(5_000n), paise(0n), weightG(1_500_000n)).value,
    ).toBe(17n);
    expect(costPerThousandSeed(paise(10_000n), 5_000n).value).toBe(2_000n);
    expect(seedCostPerThousand(paise(10_000n), 5_000n).value).toBe(2_000n);
    expect(breakEvenRatePerKg(paise(100_000n), paise(50_000n), weightG(1_500_000n)).value).toBe(
      100n,
    );
  });
});
