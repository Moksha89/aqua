export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type Paise = Brand<bigint, 'Paise'>;
export type MassMg = Brand<bigint, 'MassMg'>;
export type WeightG = Brand<bigint, 'WeightG'>;
export type Acres1e4 = Brand<bigint, 'Acres1e4'>;
export type Bp = Brand<bigint, 'Bp'>;
export type Ratio1e4 = Brand<bigint, 'Ratio1e4'>;
export const SCALES = {
  money: 100,
  massMg: 1,
  weightG: 1,
  acres: 10_000,
  percentageBp: 10_000,
  ratio: 10_000,
} as const;
export const paise = (value: bigint): Paise => value as Paise;
export const massMg = (value: bigint): MassMg => value as MassMg;
export const weightG = (value: bigint): WeightG => value as WeightG;
export const acres1e4 = (value: bigint): Acres1e4 => value as Acres1e4;
export const bp = (value: bigint): Bp => value as Bp;
export const ratio1e4 = (value: bigint): Ratio1e4 => value as Ratio1e4;
