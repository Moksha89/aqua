'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../src/lib/api';
import { Card, EmptyState, FigureCard, PageHeader } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';

export default function ClosedCropDetailPage({ params }: { params: { id: string } }) {
  const { language } = useI18n();
  const query = useQuery({ queryKey: ['closed-crop-pnl', params.id], queryFn: () => apiGet<{ cropId: string; version: number; generatedAt: string; payload?: { revenuePaise?: string; costPaise?: string; netProfitPaise?: string } }>(`/crops/${params.id}/frozen-pnl`) });
  const payload = query.data?.payload;
  return <section className="rise"><PageHeader eyebrow={language === 'te' ? 'ఆర్కైవ్' : 'Archive'} title={language === 'te' ? 'మూసిన పంట వివరాలు' : 'Closed-crop detail'} subtitle={language === 'te' ? 'ఈ పంట రికార్డులు చదవడానికి మాత్రమే.' : 'Read-only crop history and frozen P&L.'} /><Card className="card-pad">{query.isLoading ? <p className="muted">{language === 'te' ? 'లోడ్ అవుతోంది…' : 'Loading frozen P&L…'}</p> : null}{query.data === null ? <EmptyState title={language === 'te' ? 'P&L ఇంకా లేదు' : 'Frozen P&L not available'} body={language === 'te' ? 'ఈ పంటకు నిలిపిన P&L రికార్డు లేదు.' : 'This crop does not have a frozen P&L record.'} /> : query.data ? <><div className="grid grid-cols-3 gap-2"><FigureCard label={language === 'te' ? 'ఆదాయం' : 'Revenue'} figure={moneyFigure(payload?.revenuePaise)} /><FigureCard label={language === 'te' ? 'ఖర్చు' : 'Cost'} figure={moneyFigure(payload?.costPaise)} /><FigureCard label={language === 'te' ? 'నికర లాభం' : 'Net profit'} figure={moneyFigure(payload?.netProfitPaise)} /></div><p className="muted mt-4 text-sm">{language === 'te' ? `వెర్షన్ ${query.data.version} · ${shortDate(query.data.generatedAt)}` : `Version ${query.data.version} · ${shortDate(query.data.generatedAt)}`}</p><span className="chip mt-3">{language === 'te' ? 'చదవడానికి మాత్రమే' : 'Read only'}</span></> : null}</Card></section>;
}
function moneyFigure(value?: string) { return value ? { value: `₹${(Number(value) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, unit: '', status: 'DETERMINED' } : { value: '', unit: '₹', status: 'NOT_DETERMINABLE', reason: 'Frozen value is not available.' }; }
function shortDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
