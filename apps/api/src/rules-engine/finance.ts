import { Bp, MassMg, Paise, WeightG, bp, paise, weightG } from './scales';
import { Derived, e, roundHalfUp } from './envelope';

export type HarvestLine = { quantityG: WeightG; ratePaise: Paise };
export const totalHarvestedWeight = (lines: HarvestLine[]): Derived<WeightG> =>
  e(
    weightG(lines.reduce((a, l) => a + l.quantityG, 0n)),
    'g',
    1,
    'ACTUAL',
    'Σ quantityG',
    { lines },
    ['Sum lines'],
  );
export const grossHarvestValue = (lines: HarvestLine[]): Derived<Paise> =>
  e(
    paise(lines.reduce((a, l) => a + roundHalfUp(l.quantityG * l.ratePaise, 1000n), 0n)),
    'paise',
    100,
    'ACTUAL',
    'Σ(quantityG / 1000 × ratePaise)',
    { lines },
    ['Value each line'],
  );
export const netRealisation = (gross: Paise, deductions: Paise): Derived<Paise> =>
  e(
    paise(gross - deductions),
    'paise',
    100,
    'ACTUAL',
    'gross − deductions',
    { gross, deductions },
    ['Subtract deductions'],
  );
export const animalsHarvested = (weight: WeightG, abwMg: MassMg): Derived<bigint> =>
  abwMg <= 0n
    ? e<bigint>(null, 'animals', 1, 'NOT_DETERMINABLE', 'weight / ABW', { weight, abwMg }, [
        'ABW required',
      ])
    : e(
        roundHalfUp(weight * 1000n, abwMg),
        'animals',
        1,
        'ACTUAL',
        'weightG×1000 / ABWmg',
        { weight, abwMg },
        ['Derive animals'],
      );
export type DirectCostHeads = Record<string, Paise>;
export type PnlInput = {
  harvestSales: Paise;
  harvestCosts: Paise;
  otherIncome: Paise;
  directCosts: DirectCostHeads;
  lease: Paise;
  depreciation: Paise;
  allocatedCommon: Paise;
  harvestedWeightG: WeightG;
  feedCost: Paise;
  electricity: Paise;
  diesel: Paise;
  gensetRent: Paise;
};
export type PnlKpis = {
  costPerKg: Derived<Paise>;
  realisedAverageRatePerKg: Derived<Paise>;
  marginPerKg: Derived<Paise>;
  feedCostPct: Derived<Bp>;
  feedCostPerKg: Derived<Paise>;
  powerCostPerKg: Derived<Paise>;
};
export type PnlResult = {
  harvestSales: Derived<Paise>;
  lessHarvestCosts: Derived<Paise>;
  netHarvestRealisation: Derived<Paise>;
  otherIncomeScrap: Derived<Paise>;
  totalRevenueA: Derived<Paise>;
  totalDirectCostsB: Derived<Paise>;
  grossMargin: Derived<Paise>;
  lease: Derived<Paise>;
  depreciation: Derived<Paise>;
  allocatedCommon: Derived<Paise>;
  totalApportionedC: Derived<Paise>;
  netProfit: Derived<Paise>;
  kpis: PnlKpis;
  [key: string]: Derived<Paise> | PnlKpis;
};
const line = (value: Paise, formula: string, input: Record<string, unknown>): Derived<Paise> =>
  e(value, 'paise', 100, 'ACTUAL', formula, input, ['P&L line']);
export const pnl = (x: PnlInput): PnlResult => {
  const direct = Object.values(x.directCosts).reduce((a, b) => paise(a + b), paise(0n));
  const apportioned = paise(x.lease + x.depreciation + x.allocatedCommon);
  const totalRevenue = paise(x.harvestSales - x.harvestCosts + x.otherIncome);
  const grossMargin = paise(totalRevenue - direct);
  const result: Record<string, Derived<Paise>> = {
    harvestSales: line(x.harvestSales, 'harvest sales', x),
    lessHarvestCosts: line(x.harvestCosts, 'harvest costs/commission/transport', x),
    netHarvestRealisation: line(paise(x.harvestSales - x.harvestCosts), 'sales − harvest costs', x),
    otherIncomeScrap: line(x.otherIncome, 'scrap income', x),
    totalRevenueA: line(totalRevenue, 'net realisation + other income', x),
  };
  for (const [name, value] of Object.entries(x.directCosts))
    result[name] = line(value, `direct cost: ${name}`, x);
  result.totalDirectCostsB = line(direct, 'Σ twelve direct cost heads', x);
  result.grossMargin = line(grossMargin, 'A − B', x);
  result.lease = line(x.lease, 'lease', x);
  result.depreciation = line(x.depreciation, 'depreciation', x);
  result.allocatedCommon = line(x.allocatedCommon, 'allocated common', x);
  result.totalApportionedC = line(apportioned, 'lease + depreciation + common', x);
  result.netProfit = line(paise(grossMargin - apportioned), 'A − B − C', x);
  return {
    ...result,
    kpis: {
      costPerKg: costPerKg(paise(direct + apportioned), x.harvestedWeightG),
      realisedAverageRatePerKg: realisedAverageRatePerKg(x.harvestSales, x.harvestedWeightG),
      marginPerKg: marginPerKg(x.harvestSales, paise(direct + apportioned), x.harvestedWeightG),
      feedCostPct: feedCostPct(x.feedCost, paise(direct + apportioned)),
      feedCostPerKg: feedCostPerKg(x.feedCost, x.harvestedWeightG),
      powerCostPerKg: powerCostPerKg(x.electricity, x.diesel, x.gensetRent, x.harvestedWeightG),
    },
  } as unknown as PnlResult;
};
export const costPerKg = (cost: Paise, harvestedWeightG: WeightG): Derived<Paise> =>
  harvestedWeightG <= 0n
    ? e<Paise>(
        null,
        'paise/kg',
        100,
        'NOT_DETERMINABLE',
        'cost / harvested kg',
        { cost, harvestedWeightG },
        ['Harvest weight required'],
      )
    : e(
        paise(roundHalfUp(cost * 1000n, harvestedWeightG)),
        'paise/kg',
        100,
        'ACTUAL',
        'cost / harvested kg',
        { cost, harvestedWeightG },
        ['Convert grams to kilograms'],
      );
export const realisedAverageRatePerKg = (
  gross: Paise,
  harvestedWeightG: WeightG,
): Derived<Paise> =>
  harvestedWeightG <= 0n
    ? e<Paise>(
        null,
        'paise/kg',
        100,
        'NOT_DETERMINABLE',
        'gross / harvested kg',
        { gross, harvestedWeightG },
        ['Harvest weight required'],
      )
    : e(
        paise(roundHalfUp(gross * 1000n, harvestedWeightG)),
        'paise/kg',
        100,
        'ACTUAL',
        'gross harvest value / harvested kg',
        { gross, harvestedWeightG },
        ['Convert grams to kilograms'],
      );
export const marginPerKg = (
  realised: Paise,
  cost: Paise,
  harvestedWeightG: WeightG,
): Derived<Paise> => {
  const rate = realisedAverageRatePerKg(realised, harvestedWeightG);
  const actualCost = costPerKg(cost, harvestedWeightG);
  return rate.value === null || actualCost.value === null
    ? e<Paise>(
        null,
        'paise/kg',
        100,
        'NOT_DETERMINABLE',
        'realised rate − cost/kg',
        { realised, cost, harvestedWeightG },
        ['Both rate and cost required'],
      )
    : e(
        paise(rate.value - actualCost.value),
        'paise/kg',
        100,
        'ACTUAL',
        'realised rate − cost/kg',
        { realised, cost, harvestedWeightG },
        ['Subtract cost per kg'],
      );
};
export const feedCostPct = (feed: Paise, totalCost: Paise): Derived<Bp> =>
  totalCost <= 0n
    ? e<Bp>(
        null,
        'bp',
        10_000,
        'NOT_DETERMINABLE',
        'feed / total cost × 10000',
        { feed, totalCost },
        ['Total cost required'],
      )
    : e(
        bp(roundHalfUp(feed * 10_000n, totalCost)),
        'bp',
        10_000,
        'ACTUAL',
        'feed / total cost × 10000',
        { feed, totalCost },
        ['Calculate basis points'],
      );
export const feedCostPerKg = (feed: Paise, harvestedWeightG: WeightG): Derived<Paise> =>
  costPerKg(feed, harvestedWeightG);
export const powerCostPerKg = (
  electricity: Paise,
  diesel: Paise,
  gensetRent: Paise,
  harvestedWeightG: WeightG,
): Derived<Paise> => costPerKg(paise(electricity + diesel + gensetRent), harvestedWeightG);
export const costPerThousandSeed = (totalCropCost: Paise, seed: bigint): Derived<Paise> =>
  seed <= 0n
    ? e<Paise>(
        null,
        'paise/1000 seed',
        100,
        'NOT_DETERMINABLE',
        'total crop cost / (seed ÷ 1000)',
        { totalCropCost, seed },
        ['Seed quantity required'],
      )
    : e(
        paise(roundHalfUp(totalCropCost * 1000n, seed)),
        'paise/1000 seed',
        100,
        'ACTUAL',
        'total crop cost / (seed ÷ 1000)',
        { totalCropCost, seed },
        ['Normalize to one thousand seed'],
      );
export const seedCostPerThousand = (seedCost: Paise, seed: bigint): Derived<Paise> =>
  seed <= 0n
    ? e<Paise>(
        null,
        'paise/1000 seed',
        100,
        'NOT_DETERMINABLE',
        'seed line cost / (seed ÷ 1000)',
        { seedCost, seed },
        ['Seed quantity required'],
      )
    : e(
        paise(roundHalfUp(seedCost * 1000n, seed)),
        'paise/1000 seed',
        100,
        'ACTUAL',
        'seed line cost / (seed ÷ 1000)',
        { seedCost, seed },
        ['Normalize seed line cost to one thousand seed'],
      );

export const breakEvenRatePerKg = (
  committed: Paise,
  remaining: Paise,
  projectedWeightG: WeightG,
): Derived<Paise> =>
  projectedWeightG <= 0n
    ? e<Paise>(
        null,
        'paise/kg',
        100,
        'NOT_DETERMINABLE',
        '(committed+remaining)/projected weight',
        { committed, remaining, projectedWeightG },
        ['Projected weight required'],
      )
    : e(
        paise(roundHalfUp((committed + remaining) * 1000n, projectedWeightG)),
        'paise/kg',
        100,
        'ESTIMATED',
        '(committed + projected remaining) / projected weight',
        { committed, remaining, projectedWeightG },
        ['Forward-looking deviation pending client confirmation'],
      );
