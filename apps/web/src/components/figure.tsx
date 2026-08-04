'use client';

import type { components } from '../lib/api.generated';
type FigureValue = components['schemas']['OperationalFigureDto'];
export function Figure({ label, figure }: { label: string; figure: FigureValue }) {
  const item = figure;
  const status = item.status.toUpperCase();
  const notDetermined = status === 'NOT_DETERMINABLE';
  return <details className="rounded-lg border border-border bg-surface p-3"><summary className="cursor-pointer text-sm text-textSecondary">{label}</summary><div className="mt-2 text-lg font-semibold">{notDetermined ? <span className="text-warning">Not determinable</span> : item.value ?? '—'} {item.unit}</div>{status !== 'DETERMINED' && <span className="mt-1 inline-block text-xs font-semibold text-warning">{status}</span>}{notDetermined && item.reason && <p className="mt-1 text-sm text-textSecondary">{item.reason}</p>}<div className="mt-2 space-y-1 text-xs text-textSecondary">{item.derivation.inputs.map((input) => <div key={input} className="flex justify-between gap-3"><span>Input</span><span className="text-right">{input}</span></div>)}{item.derivation.steps.map((step) => <div key={step} className="flex justify-between gap-3"><span>Step</span><span className="text-right">{step}</span></div>)}</div></details>;
}
