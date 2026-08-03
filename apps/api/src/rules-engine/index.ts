export type Status = 'ESTIMATED' | 'ACTUAL' | 'NOT_DETERMINABLE';
export type Derivation = {
  formula: string;
  inputs: Record<string, unknown>;
  steps: string[];
};
export type Derived<T> = {
  value: T | null;
  unit: string;
  status: Status;
  derivation: Derivation;
};

const envelope = <T>(
  value: T | null,
  unit: string,
  status: Status,
  formula: string,
  inputs: Record<string, unknown>,
  steps: string[],
): Derived<T> => ({ value, unit, status, derivation: { formula, inputs, steps } });

/** Money uses integer paise. Fractions are retained until the final half-up rounding. */
export const roundHalfUp = (numerator: bigint, denominator: bigint): bigint => {
  if (denominator <= 0n) throw new Error('denominator must be positive');
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return sign * ((absolute * 2n + denominator) / (2n * denominator));
};

export const occupancyDays = (preparationStart: Date, finalHarvest: Date): Derived<number> => {
  const days = Math.floor((Date.UTC(finalHarvest.getUTCFullYear(), finalHarvest.getUTCMonth(), finalHarvest.getUTCDate()) -
    Date.UTC(preparationStart.getUTCFullYear(), preparationStart.getUTCMonth(), preparationStart.getUTCDate())) / 86_400_000) + 1;
  return envelope(days, 'days', 'ACTUAL', '(finalHarvest - preparationStart) + 1',
    { preparationStart: preparationStart.toISOString(), finalHarvest: finalHarvest.toISOString() }, ['Calendar date difference', 'Add one because both endpoints are occupied']);
};

export const stockingDensity = (quantities: bigint[], extentAcres: number): Derived<number> => {
  const total = quantities.reduce((a, b) => a + b, 0n);
  const value = Number(total) / extentAcres;
  return envelope(value, 'pieces/acre', 'ACTUAL', 'sum(batch.quantityPieces) / pond.extentAcres',
    { quantities, extentAcres }, [`${total} pieces / ${extentAcres} acres`]);
};

export const abw = (sampleWeightG: bigint, animalsInSample: bigint): Derived<bigint> => {
  if (animalsInSample <= 0n) return envelope<bigint>(null, 'g', 'NOT_DETERMINABLE', 'sampleWeightG / animalsInSample', { sampleWeightG, animalsInSample }, ['Sample count must be positive']);
  return envelope(roundHalfUp(sampleWeightG, animalsInSample), 'g', 'ACTUAL', 'sampleWeightG / animalsInSample', { sampleWeightG, animalsInSample }, [`${sampleWeightG}g / ${animalsInSample} animals`]);
};

export const countShrimp = (abwG: bigint): Derived<bigint> => {
  if (abwG <= 0n) return envelope<bigint>(null, 'pieces/kg', 'NOT_DETERMINABLE', '1000 / abwG', { abwG }, ['ABW must be positive']);
  return envelope(roundHalfUp(1000n * 1000n, abwG), 'pieces/kg', 'ACTUAL', '1000 / abwG', { abwG }, ['Convert kilograms to grams', 'Divide 1000g by ABW']);
};

export const adg = (currentAbwG: bigint, previousAbwG: bigint, daysBetween: bigint): Derived<bigint> => {
  if (daysBetween <= 0n) return envelope<bigint>(null, 'g/day', 'NOT_DETERMINABLE', '(current - previous) / days', { currentAbwG, previousAbwG, daysBetween }, ['Days must be positive']);
  return envelope(roundHalfUp((currentAbwG - previousAbwG) * 1000n, daysBetween), 'mg/day', 'ACTUAL', '(currentAbwG - previousAbwG) / days', { currentAbwG, previousAbwG, daysBetween }, ['Subtract previous ABW', 'Divide by elapsed days']);
};

export const estimatedSurvivors = (seedStocked: bigint, survivalPct: bigint, partialHarvestAnimals = 0n): Derived<bigint> =>
  envelope(roundHalfUp(seedStocked * survivalPct, 100n) - partialHarvestAnimals, 'animals', 'ESTIMATED',
    'seedStocked × survivalPct / 100 − partialHarvestAnimals', { seedStocked, survivalPct, partialHarvestAnimals }, ['Apply survival assumption', 'Subtract partial harvest animals']);

export const estimatedBiomassKg = (survivors: bigint, abwG: bigint): Derived<bigint> =>
  envelope(roundHalfUp(survivors * abwG, 1000n), 'kg', 'ESTIMATED', 'survivors × abwG / 1000', { survivors, abwG }, ['Multiply animals by grams per animal', 'Convert grams to kilograms']);

export const feedingRatePct = (dailyFeedKg: bigint, biomassKg: bigint): Derived<bigint> =>
  biomassKg <= 0n ? envelope<bigint>(null, '%', 'NOT_DETERMINABLE', 'dailyFeedKg / biomassKg × 100', { dailyFeedKg, biomassKg }, ['Biomass must be positive']) :
    envelope(roundHalfUp(dailyFeedKg * 10000n, biomassKg), '%', 'ESTIMATED', 'dailyFeedKg / biomassKg × 100', { dailyFeedKg, biomassKg }, ['Divide feed by biomass', 'Multiply by 100']);

export const fcr = (feedKg: bigint, biomassGainedKg: bigint, status: Status = 'ESTIMATED'): Derived<bigint> =>
  biomassGainedKg <= 0n ? envelope<bigint>(null, 'ratio', 'NOT_DETERMINABLE', 'feedKg / biomassGainedKg', { feedKg, biomassGainedKg }, ['Biomass gain must be positive']) :
    envelope(roundHalfUp(feedKg * 1000n, biomassGainedKg), 'ratio×1000', status, 'feedKg / biomassGainedKg', { feedKg, biomassGainedKg }, ['Divide feed consumed by biomass gained']);

export const leaseCost = (ratePerAcrePerAnnumPaise: bigint, acres: bigint, days: bigint): Derived<bigint> =>
  envelope(roundHalfUp(ratePerAcrePerAnnumPaise * acres * days, 365n), 'paise', 'ACTUAL', 'annualRate × acres × occupancyDays / 365', { ratePerAcrePerAnnumPaise, acres, days }, ['Multiply annual rate by area and days', 'Divide by 365 and round half-up']);

export const depreciationCost = (costPaise: bigint, salvagePct: bigint, usefulLifeYears: bigint, days: bigint): Derived<bigint> =>
  envelope(roundHalfUp(costPaise * (100n - salvagePct) * days, usefulLifeYears * 365n * 100n), 'paise', 'ACTUAL',
    '(cost − salvage) × days / (lifeYears × 365)', { costPaise, salvagePct, usefulLifeYears, days }, ['Calculate depreciable basis', 'Calculate daily straight-line depreciation', 'Round final amount half-up']);

export type AssetWindow = { costPaise: bigint; salvagePct: bigint; usefulLifeYears: bigint; purchaseDate: Date; disposalDate?: Date };
export const depreciationForWindow = (asset: AssetWindow, from: Date, to: Date): Derived<bigint> => {
  const start = Math.max(from.getTime(), asset.purchaseDate.getTime());
  const end = Math.min(to.getTime(), asset.disposalDate?.getTime() ?? to.getTime());
  const days = end < start ? 0n : BigInt(Math.floor((Date.UTC(new Date(end).getUTCFullYear(), new Date(end).getUTCMonth(), new Date(end).getUTCDate()) - Date.UTC(new Date(start).getUTCFullYear(), new Date(start).getUTCMonth(), new Date(start).getUTCDate())) / 86_400_000) + 1);
  return depreciationCost(asset.costPaise, asset.salvagePct, asset.usefulLifeYears, days);
};

export type Purchase = { quantity: bigint; ratePaise: bigint };
export const weightedAverageRate = (purchases: Purchase[], fallbackRatePaise?: bigint): Derived<bigint> => {
  const quantity = purchases.reduce((a, p) => a + p.quantity, 0n);
  if (quantity > 0n) {
    const value = purchases.reduce((a, p) => a + p.quantity * p.ratePaise, 0n);
    return envelope(roundHalfUp(value, quantity), 'paise/unit', 'ACTUAL', 'Σ(quantity × rate) / Σ(quantity)', { purchases }, ['Use crop purchases to date', 'Round weighted average at final step']);
  }
  if (fallbackRatePaise !== undefined) return envelope(fallbackRatePaise, 'paise/unit', 'ESTIMATED', 'item master rate effective on or before consumption date', { fallbackRatePaise }, ['No crop purchase available', 'Use latest effective master rate']);
  return envelope<bigint>(null, 'paise/unit', 'NOT_DETERMINABLE', 'rate sourcing fallback', { purchases }, ['No crop purchase or effective master rate']);
};

export type CommonAllocationInput = { commonCostPaise: bigint; basisValue: bigint; totalBasisValue: bigint; activeDays: bigint; daysInPeriod: bigint };
export const commonAllocation = (input: CommonAllocationInput): Derived<bigint> => {
  if (input.totalBasisValue <= 0n || input.daysInPeriod <= 0n) return envelope<bigint>(null, 'paise', 'NOT_DETERMINABLE', 'common × basis share × active day share', input, ['Allocation denominator must be positive']);
  return envelope(roundHalfUp(input.commonCostPaise * input.basisValue * input.activeDays, input.totalBasisValue * input.daysInPeriod), 'paise', 'ACTUAL',
    'commonCost × (basis / totalBasis) × (activeDays / daysInPeriod)', input, ['Calculate pond basis share', 'Calculate active-day share', 'Multiply and round final paise']);
};

export const partialHarvestSurvivors = (survivors: bigint, harvestedAnimals: bigint): Derived<bigint> =>
  envelope(survivors - harvestedAnimals, 'animals', 'ESTIMATED', 'survivors − partial harvest animals', { survivors, harvestedAnimals }, ['Reduce standing population by harvested animals']);

export const actualSurvival = (totalHarvestedWeightKg: bigint, harvestAbwG: bigint, seedStocked: bigint): Derived<bigint> => {
  if (harvestAbwG <= 0n || seedStocked <= 0n) return envelope<bigint>(null, '%', 'NOT_DETERMINABLE', '(harvestedWeight × 1000 / ABW) / seed × 100', { totalHarvestedWeightKg, harvestAbwG, seedStocked }, ['Positive harvest sample and seed quantity are required']);
  return envelope(roundHalfUp(totalHarvestedWeightKg * 100000n, harvestAbwG * seedStocked), '%', 'ACTUAL',
    '(totalHarvestedWeightKg × 1000 / harvestAbwG) / seedStocked × 100', { totalHarvestedWeightKg, harvestAbwG, seedStocked }, ['Derive harvested animals from weight and ABW', 'Divide by stocked seed and multiply by 100']);
};

export const harvestAbw = (sampleTaken: boolean, sampleWeightG: bigint, sampleCount: bigint): Derived<bigint> =>
  !sampleTaken ? envelope<bigint>(null, 'g', 'NOT_DETERMINABLE', 'sample_weight_g / sample_count', { sampleTaken }, ['Harvest sample was skipped']) : abw(sampleWeightG, sampleCount);

export type PnlInput = { grossRevenuePaise: bigint; directCostsPaise: bigint; timeApportionedPaise: bigint; harvestedKg: bigint; pondAcres: bigint };
export const pnl = (input: PnlInput): Record<string, Derived<bigint>> => {
  const grossMargin = input.grossRevenuePaise - input.directCostsPaise;
  const netProfit = grossMargin - input.timeApportionedPaise;
  const metric = (value: bigint, unit: string, formula: string): Derived<bigint> => envelope(value, unit, 'ACTUAL', formula, input, ['Apply P&L layout arithmetic']);
  return {
    revenue: metric(input.grossRevenuePaise, 'paise', 'gross revenue'),
    directCosts: metric(input.directCostsPaise, 'paise', 'direct costs'),
    grossMargin: metric(grossMargin, 'paise', 'revenue − direct costs'),
    timeApportioned: metric(input.timeApportionedPaise, 'paise', 'time-apportioned costs'),
    netProfit: metric(netProfit, 'paise', 'gross margin − time-apportioned costs'),
    yieldPerAcre: input.pondAcres > 0n ? metric(roundHalfUp(input.harvestedKg * 1000n, input.pondAcres), 'kg/acre', 'harvested kg / pond acres') : envelope<bigint>(null, 'kg/acre', 'NOT_DETERMINABLE', 'harvested kg / pond acres', input, ['Pond extent must be positive']),
    costPerKg: input.harvestedKg > 0n ? metric(roundHalfUp((input.directCostsPaise + input.timeApportionedPaise), input.harvestedKg), 'paise/kg', 'total crop cost / harvested kg') : envelope<bigint>(null, 'paise/kg', 'NOT_DETERMINABLE', 'total crop cost / harvested kg', input, ['Harvested weight must be positive']),
    profitPerAcre: input.pondAcres > 0n ? metric(roundHalfUp(netProfit, input.pondAcres), 'paise/acre', 'net profit / pond acres') : envelope<bigint>(null, 'paise/acre', 'NOT_DETERMINABLE', 'net profit / pond acres', input, ['Pond extent must be positive']),
    roiPct: input.directCostsPaise + input.timeApportionedPaise > 0n ? metric(roundHalfUp(netProfit * 10000n, input.directCostsPaise + input.timeApportionedPaise), 'basis points', 'net profit / total crop cost × 100') : envelope<bigint>(null, '%', 'NOT_DETERMINABLE', 'net profit / total crop cost × 100', input, ['Total cost must be positive']),
  };
};
