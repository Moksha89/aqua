'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../src/lib/api';
import { Card, EmptyState, PageHeader } from '../../src/components/design-system';
import { useI18n } from '../../src/lib/i18n';

export default function ClosurePage() {
  const { language } = useI18n();
  const ponds = useQuery({ queryKey: ['closure-ponds'], queryFn: () => apiGet<Array<{ id: string; name: string; activeCrop?: { id: string; code: string } | null }>>('/masters/ponds') });
  const [cropId, setCropId] = useState('');
  useEffect(() => { if (!cropId) setCropId(ponds.data?.find((pond) => pond.activeCrop)?.activeCrop?.id ?? ''); }, [ponds.data, cropId]);
  const checklist = useQuery({ queryKey: ['closure-checklist', cropId], queryFn: () => apiGet<Array<Record<string, unknown>>>(`/crops/${cropId}/closure-checklist`), enabled: Boolean(cropId) });
  return <section className="rise"><PageHeader eyebrow={language === 'te' ? 'ముగింపు' : 'Closure'} title={language === 'te' ? 'పంట ముగింపు జాబితా' : 'Closure checklist'} subtitle={language === 'te' ? 'P&L నిలిపే ముందు పంట తనిఖీలను పూర్తి చేయండి.' : 'Complete harvest, stock, occupancy, and allocation checks before freezing P&L.'} /><Card className="card-pad"><label className="field-label">{language === 'te' ? 'చెరువు మరియు పంట' : 'Pond and crop'}<select className="field-input" value={cropId} onChange={(event) => setCropId(event.target.value)}><option value="">{language === 'te' ? 'పంట ఎంచుకోండి' : 'Select active crop'}</option>{(ponds.data ?? []).filter((pond) => pond.activeCrop).map((pond) => <option key={pond.activeCrop!.id} value={pond.activeCrop!.id}>{pond.name} · {pond.activeCrop!.code}</option>)}</select></label>{checklist.isLoading ? <p className="muted mt-4">{language === 'te' ? 'లోడ్ అవుతోంది…' : 'Loading checklist…'}</p> : null}{checklist.error ? <p className="text-danger mt-4">{language === 'te' ? 'చెక్‌లిస్ట్ లోడ్ కాలేదు.' : 'Checklist could not be loaded.'}</p> : null}{checklist.data && checklist.data.length === 0 ? <EmptyState title={language === 'te' ? 'చెక్‌లిస్ట్ ఇంకా లేదు' : 'No checklist steps yet'} body={language === 'te' ? 'ఈ పంటకు ముగింపు దశలు ఇంకా నమోదు కాలేదు.' : 'No closure steps have been recorded for this crop yet.'} /> : null}<div className="mt-4 grid gap-3">{(checklist.data ?? []).map((step) => <Card className="card-pad" key={String(step.id ?? step.step)}><div className="flex items-center justify-between gap-3"><p className="font-extrabold">{String(step.step ?? 'Step')}. {friendly(step.title ?? step.name ?? 'Closure check')}</p><span className="chip">{friendly(step.status ?? (step.completedAt ? 'Completed' : 'Pending'))}</span></div>{step.completedAt ? <p className="muted mt-2 text-sm">{shortDate(step.completedAt)}</p> : null}</Card>)}</div></Card></section>;
}

function shortDate(value: unknown): string { const date = new Date(String(value ?? '')); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function friendly(value: unknown): string { return String(value ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
