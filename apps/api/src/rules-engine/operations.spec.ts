import {
  abw,
  actualCount,
  actualFcr,
  actualSurvival,
  abwPlausibility,
  cumulativeFcr,
  estimatedBiomass,
  estimatedSurvivors,
  feedingRatePct,
  harvestAbw,
  massMg,
  partialHarvestSurvivors,
  periodFcr,
  weightG,
  bp,
} from './index';

describe('operational derivations', () => {
  it('serialises bigint inputs in operational derivations', () => {
    const derivation = abw(massMg(10_400n), 1n);
    expect(() => JSON.stringify(derivation)).not.toThrow();
    expect(JSON.parse(JSON.stringify(derivation)).derivation.inputs.sampleWeightMg).toBe('10400');
  });
  it('retains ABW precision and uses distinct FCR scales', () => {
    expect(abw(massMg(10_400n), 1n).value).toBe(10_400n);
    expect(periodFcr(weightG(1_000n), weightG(500n)).value).toBe(20_000n);
    expect(cumulativeFcr(weightG(1_000n), weightG(2_000n), weightG(1_500n)).value).toBe(20_000n);
    expect(feedingRatePct(weightG(10n), weightG(100n)).unit).toBe('bp');
  });
  it('reduces survivors and standing biomass after partial harvest', () => {
    const survivors = estimatedSurvivors(10_000n, bp(8_000n));
    const remaining = partialHarvestSurvivors(survivors.value!, 1_000n);
    expect(remaining.value).toBe(7_000n);
    expect(estimatedBiomass(remaining.value!, massMg(10_400n)).value).toBe(72_800n);
  });
  it('rejects implausible ABW jumps and propagates skipped samples', () => {
    expect(abwPlausibility(massMg(10_000n), massMg(20_000n), bp(5_000n)).value).toBe(false);
    expect(harvestAbw(false, massMg(100_000n), 10n).status).toBe('NOT_DETERMINABLE');
    expect(actualSurvival(weightG(1_000n), massMg(0n), 10_000n).status).toBe('NOT_DETERMINABLE');
    expect(actualCount(massMg(0n)).status).toBe('NOT_DETERMINABLE');
    expect(actualFcr(weightG(1_000n), weightG(2_000n), weightG(1_000n), false).status).toBe(
      'NOT_DETERMINABLE',
    );
  });
});
