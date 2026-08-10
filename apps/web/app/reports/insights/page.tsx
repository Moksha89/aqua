'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../src/lib/api';
import { Card, Disclosure, EmptyState, FigureCard, PageHeader } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';
import { formatPaise } from '../../../src/lib/money';

export default function InsightsPage() {
  const { language, t } = useI18n();
  const query = useQuery({ queryKey: ['report-insights'], queryFn: () => apiGet<{ figures: { revenuePaise: string; costPaise: string; netProfitPaise: string }; insights: Array<{ kind: string; message: string }> }>('/finance/reports/insights') });
  return <section className="rise"><PageHeader eyebrow={t.reports} title={language === 'te' ? 'ఫార్మ్ సూచనలు' : 'Farm insights'} subtitle={language === 'te' ? 'మీ ఫార్మ్ రికార్డుల నుంచి సర్వర్ రూపొందించిన సూచనలు.' : 'Farmer-facing observations from server-backed reports.'} /><Card className="card-pad">{query.isLoading ? <p className="muted">{t.loading}</p> : null}{query.error ? <p className="text-danger">{t.reportLoad}</p> : null}{query.data ? <><div className="grid grid-cols-3 gap-2"><FigureCard label={t.revenue} figure={moneyFigure(query.data.figures.revenuePaise)} /><FigureCard label={t.cost} figure={moneyFigure(query.data.figures.costPaise)} /><FigureCard label={t.netProfit} figure={moneyFigure(query.data.figures.netProfitPaise)} /></div><Disclosure label={t.moreDetails}><div className="mt-5 grid gap-3">{query.data.insights.map((insight) => <Card className="card-pad" key={insight.kind}><p className="font-extrabold">{friendly(insight.kind)}</p><p className="muted mt-1">{localizeInsight(insight.message, language)}</p></Card>)}</div></Disclosure></> : <EmptyState title={t.noData} body={t.whyThisMatters} />}</Card></section>;
}
function moneyFigure(value: string) { return { value: formatPaise(value), unit: '', status: 'DETERMINED' }; }
function friendly(value: string) { return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function localizeInsight(message: string, language: 'en' | 'te') {
  const match = message.match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) return message;
  const date = new Date(`${match[1]}T00:00:00`);
  const formatted = Number.isNaN(date.getTime()) ? match[1] : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return language === 'te' ? `తాజా కోత ${formatted}న నమోదు చేయబడింది.` : `Latest harvest recorded on ${formatted}.`;
}
