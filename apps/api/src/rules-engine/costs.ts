import { Acres1e4, Bp, Paise, paise } from './scales';
import { Derived, e, roundHalfUp, day, days } from './envelope';

export const leaseDailyRate = (annual: Paise, acres: Acres1e4): Derived<Paise> =>
  e(
    paise(roundHalfUp(annual * acres, 365n * 10_000n)),
    'paise/day',
    100,
    'ACTUAL',
    'annual × acres / 365',
    { annual, acres },
    ['Round posted daily rate half-up'],
  );
export const leaseCost = (annual: Paise, acres: Acres1e4, occupancy: bigint): Derived<Paise> => {
  const daily = leaseDailyRate(annual, acres);
  return e(
    daily.value === null ? null : paise(daily.value * occupancy),
    'paise',
    100,
    'ACTUAL',
    'posted daily rate × occupancy',
    { annual, acres, occupancy, dailyRate: daily.value },
    ['Multiply posted daily rate'],
  );
};
export type AssetWindow = {
  costPaise: Paise;
  salvagePct: Bp;
  usefulLifeYears: bigint;
  purchaseDate: Date;
  disposalDate?: Date;
  underRepair?: boolean;
};
export const depreciationDailyRate = (asset: AssetWindow): Derived<Paise> =>
  e(
    paise(
      roundHalfUp(
        asset.costPaise * (10_000n - asset.salvagePct),
        asset.usefulLifeYears * 365n * 10_000n,
      ),
    ),
    'paise/day',
    100,
    'ACTUAL',
    '(cost − salvage) / life days',
    { asset },
    ['Round daily posted amount', 'Repair does not stop depreciation'],
  );
export const depreciationForWindow = (asset: AssetWindow, from: Date, to: Date): Derived<Paise> => {
  const start = day(from) < day(asset.purchaseDate) ? asset.purchaseDate : from;
  const end = asset.disposalDate && day(asset.disposalDate) < day(to) ? asset.disposalDate : to;
  const active = day(end) < day(start) ? 0n : days(start, end);
  const daily = depreciationDailyRate(asset);
  return e(
    paise((daily.value ?? 0n) * active),
    'paise',
    100,
    'ACTUAL',
    'posted daily depreciation × active days',
    { asset, from, to, active },
    ['Apply purchase/disposal cutoffs', 'Continue when under repair'],
  );
};
export const sharedAssetDailyDepreciation = (
  daily: Paise,
  basis: bigint,
  totalBasis: bigint,
): Derived<Paise> =>
  totalBasis <= 0n
    ? e<Paise>(
        null,
        'paise/day',
        100,
        'NOT_DETERMINABLE',
        'daily × basis / total',
        { daily, basis, totalBasis },
        ['Total basis required'],
      )
    : e(
        paise(roundHalfUp(daily * basis, totalBasis)),
        'paise/day',
        100,
        'ACTUAL',
        'daily × pond basis / total basis',
        { daily, basis, totalBasis },
        ['Split shared asset posting'],
      );

export type Purchase = { quantity: bigint; ratePaise: Paise };
export const weightedAverageRate = (purchases: Purchase[], masterRate?: Paise): Derived<Paise> => {
  const quantity = purchases.reduce((a, p) => a + p.quantity, 0n);
  if (quantity > 0n)
    return e(
      paise(
        roundHalfUp(
          purchases.reduce((a, p) => a + p.quantity * p.ratePaise, 0n),
          quantity,
        ),
      ),
      'paise/unit',
      100,
      'ACTUAL',
      'Σ quantity×rate / Σ quantity',
      { purchases },
      ['Use crop purchases; later rate history cannot revalue'],
    );
  return masterRate === undefined
    ? e<Paise>(null, 'paise/unit', 100, 'NOT_DETERMINABLE', 'rate fallback', { purchases }, [
        'No crop purchase',
        'No effective master rate',
        'ratePending=true',
      ])
    : e(masterRate, 'paise/unit', 100, 'ESTIMATED', 'effective item-master rate', { masterRate }, [
        'Use latest rate effective on consumption date',
      ]);
};
export const valueInput = (
  purchases: Purchase[],
  masterRate?: Paise,
): { rate: Derived<Paise>; ratePending: boolean } => {
  const rate = weightedAverageRate(purchases, masterRate);
  return { rate, ratePending: rate.status === 'NOT_DETERMINABLE' };
};
export type CommonAllocationInput = {
  commonCostPaise: Paise;
  basisValue: bigint;
  totalBasisValue: bigint;
  activeDays: bigint;
  daysInPeriod: bigint;
};
export const commonAllocation = (x: CommonAllocationInput): Derived<Paise> =>
  x.totalBasisValue <= 0n || x.daysInPeriod <= 0n
    ? e<Paise>(null, 'paise', 100, 'NOT_DETERMINABLE', 'common × basis × active days', x, [
        'Positive denominator required',
      ])
    : e(
        paise(
          roundHalfUp(
            x.commonCostPaise * x.basisValue * x.activeDays,
            x.totalBasisValue * x.daysInPeriod,
          ),
        ),
        'paise',
        100,
        'ACTUAL',
        'common × basis share × active day share',
        x,
        ['Apply basis share', 'Apply active-day share'],
      );
