import { Acres1e4 } from './scales';
import { Derived, e, roundHalfUp, day, days } from './envelope';

export const occupancyDays = (from: Date, to: Date): Derived<bigint> =>
  e(days(from, to), 'days', 1, 'ACTUAL', '(final − preparation) + 1', { from, to }, [
    'UTC calendar difference',
    'Include both endpoints',
  ]);
export const stockingDensity = (quantities: bigint[], acres: Acres1e4): Derived<bigint> =>
  e(
    roundHalfUp(quantities.reduce((a, b) => a + b, 0n) * 10_000n, acres),
    'pieces/acre×10000',
    10_000,
    'ACTUAL',
    'Σ quantity / acres',
    { quantities, acres },
    ['Sum batches', 'Divide fixed-point acres'],
  );
export type IdleWindow = { fromDay: number; toDay: number; days: bigint };
export const idleWindows = (
  calendarFrom: Date,
  calendarTo: Date,
  crops: Array<{ from: Date; to: Date }>,
): Derived<IdleWindow[]> => {
  const start = day(calendarFrom);
  const end = day(calendarTo);
  const occupied = crops
    .map((crop) => ({ from: Math.max(start, day(crop.from)), to: Math.min(end, day(crop.to)) }))
    .filter((crop) => crop.from <= crop.to)
    .sort((a, b) => a.from - b.from);
  const result: IdleWindow[] = [];
  let cursor = start;
  for (const crop of occupied) {
    if (crop.from > cursor)
      result.push({ fromDay: cursor, toDay: crop.from - 1, days: BigInt(crop.from - cursor) });
    cursor = Math.max(cursor, crop.to + 1);
  }
  if (cursor <= end) result.push({ fromDay: cursor, toDay: end, days: BigInt(end - cursor + 1) });
  return e(
    result,
    'calendar-day windows',
    1,
    'ACTUAL',
    'calendar − crop occupancy windows',
    { calendarFrom, calendarTo, crops },
    ['Sort crop windows', 'Subtract occupied intervals'],
  );
};
export const idleDayReconciliation = (
  calendar: bigint,
  occupancy: bigint,
  idle: bigint,
): Derived<boolean> =>
  e(
    calendar === occupancy + idle,
    'boolean',
    1,
    'ACTUAL',
    'occupancy + idle = calendar',
    { calendar, occupancy, idle },
    ['Check invariant'],
  );
