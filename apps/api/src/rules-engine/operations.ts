import { Bp, MassMg, Ratio1e4, WeightG, bp, massMg, ratio1e4, weightG } from './scales';
import { Derived, Status, e, roundHalfUp } from './envelope';

export const abw = (sampleWeightMg: MassMg, count: bigint): Derived<MassMg> =>
  count <= 0n
    ? e<MassMg>(
        null,
        'mg',
        1,
        'NOT_DETERMINABLE',
        'sampleWeightMg / count',
        { sampleWeightMg, count },
        ['Count must be positive'],
      )
    : e(
        massMg(roundHalfUp(sampleWeightMg, count)),
        'mg',
        1,
        'ACTUAL',
        'sampleWeightMg / count',
        { sampleWeightMg, count },
        ['Retain milligram precision'],
      );
export const countShrimp = (abwMg: MassMg): Derived<Ratio1e4> =>
  abwMg <= 0n
    ? e<Ratio1e4>(
        null,
        'pieces/kg×10000',
        10_000,
        'NOT_DETERMINABLE',
        '1,000,000 / ABWmg',
        { abwMg },
        ['ABW required'],
      )
    : e(
        ratio1e4(roundHalfUp(1_000_000n * 10_000n, abwMg)),
        'pieces/kg×10000',
        10_000,
        'ACTUAL',
        '1,000,000mg / ABWmg',
        { abwMg },
        ['Divide one kilogram by ABW'],
      );
export const adg = (current: MassMg, previous: MassMg, elapsedDays: bigint): Derived<MassMg> =>
  elapsedDays <= 0n
    ? e<MassMg>(
        null,
        'mg/day',
        1,
        'NOT_DETERMINABLE',
        '(current − previous) / days',
        { current, previous, elapsedDays },
        ['Days must be positive'],
      )
    : e(
        massMg(roundHalfUp(current - previous, elapsedDays)),
        'mg/day',
        1,
        'ACTUAL',
        '(current − previous) / days',
        { current, previous, elapsedDays },
        ['Divide ABW delta by days'],
      );
export const estimatedSurvivors = (seed: bigint, survival: Bp, partial = 0n): Derived<bigint> =>
  e(
    roundHalfUp(seed * survival, 10_000n) - partial,
    'animals',
    1,
    'ESTIMATED',
    'seed × survivalBp / 10000 − partial harvest',
    { seed, survival, partial },
    ['Apply survival', 'Subtract partial harvest'],
  );
export const estimatedBiomass = (survivors: bigint, abwMg: MassMg): Derived<WeightG> =>
  e(
    weightG(roundHalfUp(survivors * abwMg, 1000n)),
    'g',
    1,
    'ESTIMATED',
    'survivors × ABWmg / 1000',
    { survivors, abwMg },
    ['Convert mg to grams'],
  );
export const feedingRatePct = (feedG: WeightG, biomassG: WeightG): Derived<Bp> =>
  biomassG <= 0n
    ? e<Bp>(null, 'bp', 10_000, 'NOT_DETERMINABLE', 'feed / biomass × 10000', { feedG, biomassG }, [
        'Biomass required',
      ])
    : e(
        bp(roundHalfUp(feedG * 10_000n, biomassG)),
        'bp',
        10_000,
        'ESTIMATED',
        'feed / biomass × 10000',
        { feedG, biomassG },
        ['Calculate basis points'],
      );
export const periodFcr = (
  feedG: WeightG,
  gainG: WeightG,
  status: Status = 'ESTIMATED',
): Derived<Ratio1e4> =>
  gainG <= 0n
    ? e<Ratio1e4>(
        null,
        'ratio×10000',
        10_000,
        'NOT_DETERMINABLE',
        'feed / biomass gain',
        { feedG, gainG },
        ['Biomass gain required'],
      )
    : e(
        ratio1e4(roundHalfUp(feedG * 10_000n, gainG)),
        'ratio×10000',
        10_000,
        status,
        'feed / biomass gain',
        { feedG, gainG },
        ['Divide feed by gain'],
      );
export const cumulativeFcr = (
  feedG: WeightG,
  currentG: WeightG,
  stockedG: WeightG,
): Derived<Ratio1e4> => periodFcr(feedG, weightG(currentG - stockedG));

export const partialHarvestSurvivors = (survivors: bigint, harvested: bigint): Derived<bigint> =>
  e(
    survivors - harvested,
    'animals',
    1,
    'ESTIMATED',
    'survivors − harvested',
    { survivors, harvested },
    ['Reduce standing animals'],
  );
export const actualSurvival = (weight: WeightG, harvestAbwMg: MassMg, seed: bigint): Derived<Bp> =>
  harvestAbwMg <= 0n || seed <= 0n
    ? e<Bp>(
        null,
        'bp',
        10_000,
        'NOT_DETERMINABLE',
        'harvested animals / seed',
        { weight, harvestAbwMg, seed },
        ['Sample and seed required'],
      )
    : e(
        bp(roundHalfUp(weight * 10_000_000n, harvestAbwMg * seed)),
        'bp',
        10_000,
        'ACTUAL',
        '((weightG×1000)/ABWmg)/seed×10000',
        { weight, harvestAbwMg, seed },
        ['Derive harvested animals'],
      );
export const actualCount = (abwMg: MassMg): Derived<Ratio1e4> =>
  abwMg <= 0n
    ? e<Ratio1e4>(
        null,
        'pieces/kg×10000',
        10_000,
        'NOT_DETERMINABLE',
        '1,000,000 / ABWmg',
        { abwMg },
        ['Sample required'],
      )
    : e(
        ratio1e4(roundHalfUp(1_000_000n * 10_000n, abwMg)),
        'pieces/kg×10000',
        10_000,
        'ACTUAL',
        '1,000,000mg / ABWmg',
        { abwMg },
        ['Calculate count'],
      );
export const harvestAbw = (
  taken: boolean,
  sampleWeightMg: MassMg,
  sampleCount: bigint,
): Derived<MassMg> =>
  taken
    ? abw(sampleWeightMg, sampleCount)
    : e<MassMg>(null, 'mg', 1, 'NOT_DETERMINABLE', 'sampleWeightMg / count', { taken }, [
        'Harvest sample skipped',
      ]);
export const actualFcr = (
  feed: WeightG,
  harvested: WeightG,
  stockedBiomass: WeightG,
  harvestSampleTaken = true,
): Derived<Ratio1e4> =>
  !harvestSampleTaken
    ? e<Ratio1e4>(
        null,
        'ratio×10000',
        10_000,
        'NOT_DETERMINABLE',
        'feed / (harvested biomass − stocked biomass)',
        { feed, harvested, stockedBiomass, harvestSampleTaken },
        ['Harvest sample skipped'],
      )
    : periodFcr(feed, weightG(harvested - stockedBiomass), 'ACTUAL');
export const projectedHarvestDays = (
  current: MassMg,
  target: MassMg,
  adgMgPerDay: MassMg,
): Derived<bigint> =>
  target <= current || adgMgPerDay <= 0n
    ? e<bigint>(
        null,
        'days',
        1,
        'NOT_DETERMINABLE',
        '(target−current)/ADG',
        { current, target, adgMgPerDay },
        ['Positive growth to target required'],
      )
    : e(
        roundHalfUp(target - current, adgMgPerDay),
        'days',
        1,
        'ESTIMATED',
        '(target−current)/ADG',
        { current, target, adgMgPerDay },
        ['Calculate projected days'],
      );
export const abwPlausibility = (
  previous: MassMg,
  current: MassMg,
  maxChangeBp: Bp,
): Derived<boolean> =>
  e(
    previous > 0n &&
      (current >= previous ? current - previous : previous - current) * 10_000n <=
        previous * maxChangeBp,
    'boolean',
    1,
    'ACTUAL',
    '|current−previous| / previous ≤ threshold',
    { previous, current, maxChangeBp },
    ['Compare fixed-point change'],
  );
