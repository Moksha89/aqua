export type Status = 'ESTIMATED' | 'ACTUAL' | 'NOT_DETERMINABLE';
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type Derivation = {
  formula: string;
  inputs: { [key: string]: JsonValue };
  steps: string[];
};
export type Derived<T> = {
  value: T | null;
  unit: string;
  scale: number;
  status: Status;
  derivation: Derivation;
  toJSON: () => JsonValue;
};
export const toJsonSafe = (value: unknown): JsonValue => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(toJsonSafe);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toJsonSafe(entry)]),
    );
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }
  return String(value);
};

export const e = <T>(
  value: T | null,
  unit: string,
  scale: number,
  status: Status,
  formula: string,
  inputs: Record<string, unknown>,
  steps: string[],
): Derived<T> => {
  const result = {
    value,
    unit,
    scale,
    status,
    derivation: {
      formula,
      inputs: toJsonSafe(inputs) as { [key: string]: JsonValue },
      steps,
    },
  };
  return {
    ...result,
    toJSON: () => toJsonSafe(result),
  };
};
export const roundHalfUp = (n: bigint, d: bigint): bigint => {
  if (d <= 0n) throw new Error('denominator must be positive');
  const sign = n < 0n ? -1n : 1n;
  const a = n < 0n ? -n : n;
  return sign * ((a * 2n + d) / (2n * d));
};
export const day = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000;
export const days = (from: Date, to: Date): bigint => BigInt(day(to) - day(from) + 1);
