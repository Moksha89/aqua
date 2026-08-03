import { Acres1e4, Bp, MassMg, Paise, Ratio1e4, WeightG, bp, massMg, paise, ratio1e4, weightG } from './scales';

export * from './scales';
export type Status = 'ESTIMATED' | 'ACTUAL' | 'NOT_DETERMINABLE';
export type Derivation = { formula: string; inputs: Record<string, unknown>; steps: string[] };
export type Derived<T> = { value: T | null; unit: string; scale: number; status: Status; derivation: Derivation };
const e = <T>(value: T | null, unit: string, scale: number, status: Status, formula: string, inputs: Record<string, unknown>, steps: string[]): Derived<T> => ({ value, unit, scale, status, derivation: { formula, inputs, steps } });
export const roundHalfUp = (n: bigint, d: bigint): bigint => {
  if (d <= 0n) throw new Error('denominator must be positive');
  const sign = n < 0n ? -1n : 1n; const a = n < 0n ? -n : n;
  return sign * ((a * 2n + d) / (2n * d));
};
const day = (d: Date): number => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000;
const days = (from: Date, to: Date): bigint => BigInt(day(to) - day(from) + 1);

export const occupancyDays = (from: Date, to: Date): Derived<bigint> => e(days(from, to), 'days', 1, 'ACTUAL', '(final − preparation) + 1', { from, to }, ['UTC calendar difference', 'Include both endpoints']);
export const stockingDensity = (quantities: bigint[], acres: Acres1e4): Derived<bigint> => e(roundHalfUp(quantities.reduce((a, b) => a + b, 0n) * 10_000n, acres), 'pieces/acre×10000', 10_000, 'ACTUAL', 'Σ quantity / acres', { quantities, acres }, ['Sum batches', 'Divide fixed-point acres']);
export const abw = (sampleWeightMg: MassMg, count: bigint): Derived<MassMg> => count <= 0n ? e<MassMg>(null, 'mg', 1, 'NOT_DETERMINABLE', 'sampleWeightMg / count', { sampleWeightMg, count }, ['Count must be positive']) : e(massMg(roundHalfUp(sampleWeightMg, count)), 'mg', 1, 'ACTUAL', 'sampleWeightMg / count', { sampleWeightMg, count }, ['Retain milligram precision']);
export const countShrimp = (abwMg: MassMg): Derived<Ratio1e4> => abwMg <= 0n ? e<Ratio1e4>(null, 'pieces/kg×10000', 10_000, 'NOT_DETERMINABLE', '1,000,000 / ABWmg', { abwMg }, ['ABW required']) : e(ratio1e4(roundHalfUp(1_000_000n * 10_000n, abwMg)), 'pieces/kg×10000', 10_000, 'ACTUAL', '1,000,000mg / ABWmg', { abwMg }, ['Divide one kilogram by ABW']);
export const adg = (current: MassMg, previous: MassMg, elapsedDays: bigint): Derived<MassMg> => elapsedDays <= 0n ? e<MassMg>(null, 'mg/day', 1, 'NOT_DETERMINABLE', '(current − previous) / days', { current, previous, elapsedDays }, ['Days must be positive']) : e(massMg(roundHalfUp(current - previous, elapsedDays)), 'mg/day', 1, 'ACTUAL', '(current − previous) / days', { current, previous, elapsedDays }, ['Divide ABW delta by days']);
export const estimatedSurvivors = (seed: bigint, survival: Bp, partial = 0n): Derived<bigint> => e(roundHalfUp(seed * survival, 10_000n) - partial, 'animals', 1, 'ESTIMATED', 'seed × survivalBp / 10000 − partial harvest', { seed, survival, partial }, ['Apply survival', 'Subtract partial harvest']);
export const estimatedBiomass = (survivors: bigint, abwMg: MassMg): Derived<WeightG> => e(weightG(roundHalfUp(survivors * abwMg, 1000n)), 'g', 1, 'ESTIMATED', 'survivors × ABWmg / 1000', { survivors, abwMg }, ['Convert mg to grams']);
export const feedingRatePct = (feedG: WeightG, biomassG: WeightG): Derived<Bp> => biomassG <= 0n ? e<Bp>(null, 'bp', 10_000, 'NOT_DETERMINABLE', 'feed / biomass × 10000', { feedG, biomassG }, ['Biomass required']) : e(bp(roundHalfUp(feedG * 10_000n, biomassG)), 'bp', 10_000, 'ESTIMATED', 'feed / biomass × 10000', { feedG, biomassG }, ['Calculate basis points']);
export const periodFcr = (feedG: WeightG, gainG: WeightG, status: Status = 'ESTIMATED'): Derived<Ratio1e4> => gainG <= 0n ? e<Ratio1e4>(null, 'ratio×10000', 10_000, 'NOT_DETERMINABLE', 'feed / biomass gain', { feedG, gainG }, ['Biomass gain required']) : e(ratio1e4(roundHalfUp(feedG * 10_000n, gainG)), 'ratio×10000', 10_000, status, 'feed / biomass gain', { feedG, gainG }, ['Divide feed by gain']);
export const cumulativeFcr = (feedG: WeightG, currentG: WeightG, stockedG: WeightG): Derived<Ratio1e4> => periodFcr(feedG, weightG(currentG - stockedG));
export const fcr = periodFcr;

export const leaseDailyRate = (annual: Paise, acres: Acres1e4): Derived<Paise> => e(paise(roundHalfUp(annual * acres, 365n * 10_000n)), 'paise/day', 100, 'ACTUAL', 'annual × acres / 365', { annual, acres }, ['Round posted daily rate half-up']);
export const leaseCost = (annual: Paise, acres: Acres1e4, occupancy: bigint): Derived<Paise> => {
  const daily = leaseDailyRate(annual, acres);
  return e(daily.value === null ? null : paise(daily.value * occupancy), 'paise', 100, 'ACTUAL', 'posted daily rate × occupancy', { annual, acres, occupancy, dailyRate: daily.value }, ['Multiply posted daily rate']);
};
export type AssetWindow = { costPaise: Paise; salvagePct: Bp; usefulLifeYears: bigint; purchaseDate: Date; disposalDate?: Date; underRepair?: boolean };
export const depreciationDailyRate = (asset: AssetWindow): Derived<Paise> => e(paise(roundHalfUp(asset.costPaise * (10_000n - asset.salvagePct), asset.usefulLifeYears * 365n * 10_000n)), 'paise/day', 100, 'ACTUAL', '(cost − salvage) / life days', { asset }, ['Round daily posted amount', 'Repair does not stop depreciation']);
export const depreciationForWindow = (asset: AssetWindow, from: Date, to: Date): Derived<Paise> => {
  const start = day(from) < day(asset.purchaseDate) ? asset.purchaseDate : from;
  const end = asset.disposalDate && day(asset.disposalDate) < day(to) ? asset.disposalDate : to;
  const active = day(end) < day(start) ? 0n : days(start, end); const daily = depreciationDailyRate(asset);
  return e(paise((daily.value ?? 0n) * active), 'paise', 100, 'ACTUAL', 'posted daily depreciation × active days', { asset, from, to, active }, ['Apply purchase/disposal cutoffs', 'Continue when under repair']);
};
export const sharedAssetDailyDepreciation = (daily: Paise, basis: bigint, totalBasis: bigint): Derived<Paise> => totalBasis <= 0n ? e<Paise>(null, 'paise/day', 100, 'NOT_DETERMINABLE', 'daily × basis / total', { daily, basis, totalBasis }, ['Total basis required']) : e(paise(roundHalfUp(daily * basis, totalBasis)), 'paise/day', 100, 'ACTUAL', 'daily × pond basis / total basis', { daily, basis, totalBasis }, ['Split shared asset posting']);

export type Purchase = { quantity: bigint; ratePaise: Paise };
export const weightedAverageRate = (purchases: Purchase[], masterRate?: Paise): Derived<Paise> => {
  const quantity = purchases.reduce((a, p) => a + p.quantity, 0n);
  if (quantity > 0n) return e(paise(roundHalfUp(purchases.reduce((a, p) => a + p.quantity * p.ratePaise, 0n), quantity)), 'paise/unit', 100, 'ACTUAL', 'Σ quantity×rate / Σ quantity', { purchases }, ['Use crop purchases; later rate history cannot revalue']);
  return masterRate === undefined ? e<Paise>(null, 'paise/unit', 100, 'NOT_DETERMINABLE', 'rate fallback', { purchases }, ['No crop purchase', 'No effective master rate', 'ratePending=true']) : e(masterRate, 'paise/unit', 100, 'ESTIMATED', 'effective item-master rate', { masterRate }, ['Use latest rate effective on consumption date']);
};
export const valueInput = (purchases: Purchase[], masterRate?: Paise): { rate: Derived<Paise>; ratePending: boolean } => { const rate = weightedAverageRate(purchases, masterRate); return { rate, ratePending: rate.status === 'NOT_DETERMINABLE' }; };
export type CommonAllocationInput = { commonCostPaise: Paise; basisValue: bigint; totalBasisValue: bigint; activeDays: bigint; daysInPeriod: bigint };
export const commonAllocation = (x: CommonAllocationInput): Derived<Paise> => x.totalBasisValue <= 0n || x.daysInPeriod <= 0n ? e<Paise>(null, 'paise', 100, 'NOT_DETERMINABLE', 'common × basis × active days', x, ['Positive denominator required']) : e(paise(roundHalfUp(x.commonCostPaise * x.basisValue * x.activeDays, x.totalBasisValue * x.daysInPeriod)), 'paise', 100, 'ACTUAL', 'common × basis share × active day share', x, ['Apply basis share', 'Apply active-day share']);
export const partialHarvestSurvivors = (survivors: bigint, harvested: bigint): Derived<bigint> => e(survivors - harvested, 'animals', 1, 'ESTIMATED', 'survivors − harvested', { survivors, harvested }, ['Reduce standing animals']);
export const actualSurvival = (weight: WeightG, harvestAbwMg: MassMg, seed: bigint): Derived<Bp> => harvestAbwMg <= 0n || seed <= 0n ? e<Bp>(null, 'bp', 10_000, 'NOT_DETERMINABLE', 'harvested animals / seed', { weight, harvestAbwMg, seed }, ['Sample and seed required']) : e(bp(roundHalfUp(weight * 10_000_000n, harvestAbwMg * seed)), 'bp', 10_000, 'ACTUAL', '((weightG×1000)/ABWmg)/seed×10000', { weight, harvestAbwMg, seed }, ['Derive harvested animals']);
export const actualCount = (abwMg: MassMg): Derived<Ratio1e4> => abwMg <= 0n ? e<Ratio1e4>(null, 'pieces/kg×10000', 10_000, 'NOT_DETERMINABLE', '1,000,000 / ABWmg', { abwMg }, ['Sample required']) : e(ratio1e4(roundHalfUp(1_000_000n * 10_000n, abwMg)), 'pieces/kg×10000', 10_000, 'ACTUAL', '1,000,000mg / ABWmg', { abwMg }, ['Calculate count']);
export const harvestAbw = (taken: boolean, sampleWeightMg: MassMg, sampleCount: bigint): Derived<MassMg> => taken ? abw(sampleWeightMg, sampleCount) : e<MassMg>(null, 'mg', 1, 'NOT_DETERMINABLE', 'sampleWeightMg / count', { taken }, ['Harvest sample skipped']);
export type HarvestLine = { quantityG: WeightG; ratePaise: Paise };
export const totalHarvestedWeight = (lines: HarvestLine[]): Derived<WeightG> => e(weightG(lines.reduce((a, l) => a + l.quantityG, 0n)), 'g', 1, 'ACTUAL', 'Σ quantityG', { lines }, ['Sum lines']);
export const grossHarvestValue = (lines: HarvestLine[]): Derived<Paise> => e(paise(lines.reduce((a, l) => a + roundHalfUp(l.quantityG * l.ratePaise, 1000n), 0n)), 'paise', 100, 'ACTUAL', 'Σ(quantityG / 1000 × ratePaise)', { lines }, ['Value each line']);
export const netRealisation = (gross: Paise, deductions: Paise): Derived<Paise> => e(paise(gross - deductions), 'paise', 100, 'ACTUAL', 'gross − deductions', { gross, deductions }, ['Subtract deductions']);
export const animalsHarvested = (weight: WeightG, abwMg: MassMg): Derived<bigint> => abwMg <= 0n ? e<bigint>(null, 'animals', 1, 'NOT_DETERMINABLE', 'weight / ABW', { weight, abwMg }, ['ABW required']) : e(roundHalfUp(weight * 1000n, abwMg), 'animals', 1, 'ACTUAL', 'weightG×1000 / ABWmg', { weight, abwMg }, ['Derive animals']);
export const actualFcr = (feed: WeightG, harvested: WeightG, stockedBiomass: WeightG, harvestSampleTaken = true): Derived<Ratio1e4> => !harvestSampleTaken ? e<Ratio1e4>(null, 'ratio×10000', 10_000, 'NOT_DETERMINABLE', 'feed / (harvested biomass − stocked biomass)', { feed, harvested, stockedBiomass, harvestSampleTaken }, ['Harvest sample skipped']) : periodFcr(feed, weightG(harvested - stockedBiomass), 'ACTUAL');
export const projectedHarvestDays = (current: MassMg, target: MassMg, adgMgPerDay: MassMg): Derived<bigint> => target <= current || adgMgPerDay <= 0n ? e<bigint>(null, 'days', 1, 'NOT_DETERMINABLE', '(target−current)/ADG', { current, target, adgMgPerDay }, ['Positive growth to target required']) : e(roundHalfUp(target - current, adgMgPerDay), 'days', 1, 'ESTIMATED', '(target−current)/ADG', { current, target, adgMgPerDay }, ['Calculate projected days']);
export const abwPlausibility = (previous: MassMg, current: MassMg, maxChangeBp: Bp): Derived<boolean> => e(previous > 0n && (current >= previous ? current - previous : previous - current) * 10_000n <= previous * maxChangeBp, 'boolean', 1, 'ACTUAL', '|current−previous| / previous ≤ threshold', { previous, current, maxChangeBp }, ['Compare fixed-point change']);
export const idleDayReconciliation = (calendar: bigint, occupancy: bigint, idle: bigint): Derived<boolean> => e(calendar === occupancy + idle, 'boolean', 1, 'ACTUAL', 'occupancy + idle = calendar', { calendar, occupancy, idle }, ['Check invariant']);

export type DirectCostHeads = Record<string, Paise>;
export type PnlInput = { harvestSales: Paise; harvestCosts: Paise; otherIncome: Paise; directCosts: DirectCostHeads; lease: Paise; depreciation: Paise; allocatedCommon: Paise; harvestedWeightG: WeightG; feedCost: Paise; electricity: Paise; diesel: Paise; gensetRent: Paise };
const line = (value: Paise, formula: string, input: Record<string, unknown>): Derived<Paise> => e(value, 'paise', 100, 'ACTUAL', formula, input, ['P&L line']);
export const pnl = (x: PnlInput): Record<string, Derived<Paise>> => {
  const direct = Object.values(x.directCosts).reduce((a, b) => paise(a + b), paise(0n)); const apportioned = paise(x.lease + x.depreciation + x.allocatedCommon);
  const totalRevenue = paise(x.harvestSales - x.harvestCosts + x.otherIncome); const grossMargin = paise(totalRevenue - direct);
  const result: Record<string, Derived<Paise>> = { harvestSales: line(x.harvestSales, 'harvest sales', x), lessHarvestCosts: line(x.harvestCosts, 'harvest costs/commission/transport', x), netHarvestRealisation: line(paise(x.harvestSales - x.harvestCosts), 'sales − harvest costs', x), otherIncomeScrap: line(x.otherIncome, 'scrap income', x), totalRevenueA: line(totalRevenue, 'net realisation + other income', x) };
  for (const [name, value] of Object.entries(x.directCosts)) result[name] = line(value, `direct cost: ${name}`, x);
  result.totalDirectCostsB = line(direct, 'Σ twelve direct cost heads', x); result.grossMargin = line(grossMargin, 'A − B', x); result.lease = line(x.lease, 'lease', x); result.depreciation = line(x.depreciation, 'depreciation', x); result.allocatedCommon = line(x.allocatedCommon, 'allocated common', x); result.totalApportionedC = line(apportioned, 'lease + depreciation + common', x); result.netProfit = line(paise(grossMargin - apportioned), 'A − B − C', x);
  return result;
};
export const costPerKg = (cost: Paise, harvestedWeightG: WeightG): Derived<Paise> => harvestedWeightG <= 0n ? e<Paise>(null, 'paise/kg', 100, 'NOT_DETERMINABLE', 'cost / harvested kg', { cost, harvestedWeightG }, ['Harvest weight required']) : e(paise(roundHalfUp(cost * 1000n, harvestedWeightG)), 'paise/kg', 100, 'ACTUAL', 'cost / harvested kg', { cost, harvestedWeightG }, ['Convert grams to kilograms']);
export const realisedAverageRatePerKg = (gross: Paise, harvestedWeightG: WeightG): Derived<Paise> => harvestedWeightG <= 0n ? e<Paise>(null, 'paise/kg', 100, 'NOT_DETERMINABLE', 'gross / harvested kg', { gross, harvestedWeightG }, ['Harvest weight required']) : e(paise(roundHalfUp(gross * 1000n, harvestedWeightG)), 'paise/kg', 100, 'ACTUAL', 'gross harvest value / harvested kg', { gross, harvestedWeightG }, ['Convert grams to kilograms']);
export const marginPerKg = (realised: Paise, cost: Paise, harvestedWeightG: WeightG): Derived<Paise> => {
  const rate = realisedAverageRatePerKg(realised, harvestedWeightG); const actualCost = costPerKg(cost, harvestedWeightG);
  return rate.value === null || actualCost.value === null ? e<Paise>(null, 'paise/kg', 100, 'NOT_DETERMINABLE', 'realised rate − cost/kg', { realised, cost, harvestedWeightG }, ['Both rate and cost required']) : e(paise(rate.value - actualCost.value), 'paise/kg', 100, 'ACTUAL', 'realised rate − cost/kg', { realised, cost, harvestedWeightG }, ['Subtract cost per kg']);
};
export const feedCostPct = (feed: Paise, totalCost: Paise): Derived<Bp> => totalCost <= 0n ? e<Bp>(null, 'bp', 10_000, 'NOT_DETERMINABLE', 'feed / total cost × 10000', { feed, totalCost }, ['Total cost required']) : e(bp(roundHalfUp(feed * 10_000n, totalCost)), 'bp', 10_000, 'ACTUAL', 'feed / total cost × 10000', { feed, totalCost }, ['Calculate basis points']);
export const feedCostPerKg = (feed: Paise, harvestedWeightG: WeightG): Derived<Paise> => costPerKg(feed, harvestedWeightG);
export const powerCostPerKg = (electricity: Paise, diesel: Paise, gensetRent: Paise, harvestedWeightG: WeightG): Derived<Paise> => costPerKg(paise(electricity + diesel + gensetRent), harvestedWeightG);
export const costPerThousandSeed = (cost: Paise, seed: bigint): Derived<Paise> => seed <= 0n ? e<Paise>(null, 'paise/1000 seed', 100, 'NOT_DETERMINABLE', 'cost / seed × 1000', { cost, seed }, ['Seed quantity required']) : e(paise(roundHalfUp(cost * 1000n, seed)), 'paise/1000 seed', 100, 'ACTUAL', 'cost / seed × 1000', { cost, seed }, ['Normalize to one thousand seed']);
export const seedCostPerThousand = (seedCost: Paise, seed: bigint): Derived<Paise> => costPerThousandSeed(seedCost, seed);

export type IdleWindow = { fromDay: number; toDay: number; days: bigint };
export const idleWindows = (calendarFrom: Date, calendarTo: Date, crops: Array<{ from: Date; to: Date }>): Derived<IdleWindow[]> => {
  const start = day(calendarFrom); const end = day(calendarTo); const occupied = crops
    .map((crop) => ({ from: Math.max(start, day(crop.from)), to: Math.min(end, day(crop.to)) }))
    .filter((crop) => crop.from <= crop.to).sort((a, b) => a.from - b.from);
  const result: IdleWindow[] = []; let cursor = start;
  for (const crop of occupied) {
    if (crop.from > cursor) result.push({ fromDay: cursor, toDay: crop.from - 1, days: BigInt(crop.from - cursor) });
    cursor = Math.max(cursor, crop.to + 1);
  }
  if (cursor <= end) result.push({ fromDay: cursor, toDay: end, days: BigInt(end - cursor + 1) });
  return e(result, 'calendar-day windows', 1, 'ACTUAL', 'calendar − crop occupancy windows', { calendarFrom, calendarTo, crops }, ['Sort crop windows', 'Subtract occupied intervals']);
};
export const breakEvenRatePerKg = (committed: Paise, remaining: Paise, projectedWeightG: WeightG): Derived<Paise> => projectedWeightG <= 0n ? e<Paise>(null, 'paise/kg', 100, 'NOT_DETERMINABLE', '(committed+remaining)/projected weight', { committed, remaining, projectedWeightG }, ['Projected weight required']) : e(paise(roundHalfUp((committed + remaining) * 1000n, projectedWeightG)), 'paise/kg', 100, 'ESTIMATED', '(committed + projected remaining) / projected weight', { committed, remaining, projectedWeightG }, ['Forward-looking deviation pending client confirmation']);
