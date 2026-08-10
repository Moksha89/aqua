'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, getSession } from '../../src/lib/api';
import type { components } from '../../src/lib/api.generated';
import { useI18n } from '../../src/lib/i18n';
import { Card, Disclosure, PageHeader } from '../../src/components/design-system';
import { formatPaise } from '../../src/lib/money';

const reports = [
  ['business-pnl', 'businessPnl', 'BusinessPnlReportDto'],
  ['cash', 'cash', 'CashReportDto'],
  ['profitability', 'profitability', 'ProfitabilityReportDto'],
  ['crop-summary', 'cropSummary', 'CropSummaryReportDto'],
  ['cost-sheet', 'costSheet', 'CostSheetReportDto'],
  ['estimate-vs-actual', 'estimateVsActual', 'EstimateVsActualReportDto'],
  ['pond-history', 'pondHistory', 'PondHistoryReportDto'],
  ['lifetime-profitability', 'lifetimeProfitability', 'LifetimeProfitabilityReportDto'],
  ['cost-head-analysis', 'costHeadAnalysis', 'CostHeadAnalysisReportDto'],
  ['asset-register', 'assetRegister', 'AssetRegisterReportDto'],
  ['lease-register', 'leaseRegister', 'LeaseRegisterReportDto'],
] as const;

type ReportName = (typeof reports)[number][2];
type Report = components['schemas'][ReportName];

export default function ReportsPage() {
  const { t } = useI18n();
  const session = getSession();
  const financial = session?.financialAccess === true;
  const [selected, setSelected] = useState<ReportName>('BusinessPnlReportDto');
  const config = reports.find((item) => item[2] === selected) ?? reports[0];
  const query = useQuery({ queryKey: ['report', config[0]], queryFn: () => apiGet<Report>(`/finance/reports/${config[0]}`), enabled: financial });
  if (!financial) return <section className="rise"><PageHeader eyebrow={t.reports} title={t.reports} subtitle={t.financialUnavailable} /><Card className="card-pad"><p className="muted">{t.financialUnavailable}</p></Card></section>;
  return <section className="rise">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">{t.reports}</h1><div className="flex gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg border border-border px-3 py-2">{t.exportPdf}</button><button type="button" onClick={() => downloadReport(query.data, config[0])} className="rounded-lg border border-border px-3 py-2">{t.exportExcel}</button><button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${reportLabel(config[1], t)}\n${summary(query.data)}`)}`, '_blank', 'noopener,noreferrer')} className="rounded-lg border border-border px-3 py-2">{t.shareWhatsapp}</button></div></div>
    <div className="mt-6 flex flex-wrap gap-2">{reports.slice(0, 5).map((item) => <button type="button" key={item[2]} onClick={() => setSelected(item[2])} className={`rounded-lg border border-border px-3 py-2 text-sm ${selected === item[2] ? 'bg-primary text-onPrimary' : 'bg-surface text-textPrimary'}`}>{reportLabel(item[1], t)}</button>)}</div>
    <Disclosure label={t.officeReports}><div className="flex flex-wrap gap-2">{reports.slice(5).map((item) => <button type="button" key={item[2]} onClick={() => setSelected(item[2])} className={`rounded-lg border border-border px-3 py-2 text-sm ${selected === item[2] ? 'bg-primary text-onPrimary' : 'bg-surface text-textPrimary'}`}>{reportLabel(item[1], t)}</button>)}</div></Disclosure>
    {query.isLoading && <p className="mt-6 text-textSecondary">{t.loading}</p>}{query.error && <p className="mt-6 text-danger">{query.error.message}</p>}{query.data && <ReportView report={query.data} />}
  </section>;
}

function ReportView({ report }: { report: Report }) {
  return <div className="mt-6 grid gap-4 md:grid-cols-3">{Object.entries(report).map(([key, value]) => <article key={key} className="rounded-xl border border-border bg-surface p-4"><h2 className="font-semibold text-textPrimary">{labelKey(key)}</h2><ReadableValue value={value} path={key} /></article>)}</div>;
}
function ReadableValue({ value, path = '' }: { value: unknown; path?: string }) {
  if (Array.isArray(value)) return <div className="mt-2 space-y-2">{value.map((item, index) => <div key={index} className="rounded-lg border border-border p-2"><p className="text-xs font-bold text-textSecondary">Details</p><ReadableValue value={item} path={path} /></div>)}</div>;
  if (value && typeof value === 'object') return <div className="mt-2 space-y-1">{Object.entries(value).map(([key, item]) => <div key={key} className="flex justify-between gap-3 text-sm"><span className="text-textSecondary">{labelKey(key)}</span><span className="text-right text-textPrimary">{formatReportValue(item, key)}</span></div>)}</div>;
  return <p className="mt-2 text-xl font-semibold text-textPrimary">{formatReportValue(value, path)}</p>;
}
function downloadReport(report: Report | undefined, name: string) {
  if (!report) return;
  const rows = Object.entries(report).map(([key, value]) => `${labelKey(key)},${JSON.stringify(formatReportValue(value, key))}`).join('\n');
  const blob = new Blob([`field,value\n${rows}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name}.csv`; anchor.click(); URL.revokeObjectURL(url);
}
function reportLabel(key: string, t: ReturnType<typeof useI18n>['t']): string {
  const labels: Record<string, string> = { businessPnl: t.businessPnl, cash: t.reportCash, profitability: t.reportProfitability, cropSummary: t.reportCropSummary, costSheet: t.reportCostSheet, estimateVsActual: t.reportEstimateVsActual, pondHistory: t.reportPondHistory, lifetimeProfitability: t.reportLifetimeProfitability, costHeadAnalysis: t.reportCostHeadAnalysis, assetRegister: t.reportAssetRegister, leaseRegister: t.reportLeaseRegister };
  return labels[key] ?? t.reports;
}
function summary(report: Report | undefined): string {
  if (!report) return '';
  return Object.entries(report).filter(([, value]) => typeof value !== 'object').map(([key, value]) => `${labelKey(key)}: ${formatReportValue(value, key)}`).join('\n');
}
function labelKey(key: string): string {
  const withoutUnit = key.replace(/Paise$/i, '');
  const known: Record<string, string> = { view: 'Summary', expenses: 'Expenses', payments: 'Payments', revenue: 'Revenue', cost: 'Cost', netProfit: 'Net profit' };
  return known[withoutUnit] ?? withoutUnit.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatReportValue(value: unknown, key = ''): string {
  if (value === null || value === undefined || value === '') return '—';
  if ((typeof value === 'number' || typeof value === 'string') && /paise|amount|revenue|cost|profit|payment|expense|cash/i.test(key)) return formatPaise(value);
  if (typeof value === 'object') return '[details]';
  return String(value);
}
