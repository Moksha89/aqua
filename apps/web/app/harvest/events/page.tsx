'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../src/lib/api';
import { Card, EmptyState, FigureCard, PageHeader } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';

export default function HarvestEventsPage() {
  const { language } = useI18n();
  const ponds = useQuery({ queryKey: ['harvest-event-ponds'], queryFn: () => apiGet<Array<{ id: string; name: string; activeCrop?: { id: string; code: string } | null }>>('/masters/ponds') });
  const [cropId, setCropId] = useState('');
  useEffect(() => { if (!cropId) setCropId(ponds.data?.find((pond) => pond.activeCrop)?.activeCrop?.id ?? ''); }, [ponds.data, cropId]);
  const events = useQuery({ queryKey: ['harvest-events', cropId], queryFn: () => apiGet<Array<Record<string, unknown>>>(`/crops/${cropId}/harvests`), enabled: Boolean(cropId) });
  return <section className="rise"><PageHeader eyebrow={language === 'te' ? 'కోత' : 'Harvest'} title={language === 'te' ? 'కోత రికార్డులు' : 'Harvest events'} subtitle={language === 'te' ? 'చెరువు పంట కోత రికార్డులను చూడండి.' : 'Review count-wise shrimp and grade-wise fish harvests.'} /><Card className="card-pad"><label className="field-label">{language === 'te' ? 'చెరువు మరియు పంట' : 'Pond and crop'}<select className="field-input" value={cropId} onChange={(event) => setCropId(event.target.value)}><option value="">{language === 'te' ? 'పంట ఎంచుకోండి' : 'Select active crop'}</option>{(ponds.data ?? []).filter((pond) => pond.activeCrop).map((pond) => <option key={pond.activeCrop!.id} value={pond.activeCrop!.id}>{pond.name} · {pond.activeCrop!.code}</option>)}</select></label>{events.isLoading ? <p className="muted mt-4">{language === 'te' ? 'లోడ్ అవుతోంది…' : 'Loading harvests…'}</p> : null}{events.error ? <p className="text-danger mt-4">{language === 'te' ? 'కోత రికార్డులు లోడ్ కాలేదు.' : 'Harvest records could not be loaded.'}</p> : null}{events.data && events.data.length === 0 ? <EmptyState title={language === 'te' ? 'కోతలు లేవు' : 'No harvests yet'} body={language === 'te' ? 'ఈ పంటకు ఇంకా కోత నమోదు కాలేదు.' : 'No harvest has been recorded for this crop yet.'} /> : null}<div className="mt-4 grid gap-3">{(events.data ?? []).map((event) => <HarvestRow key={String(event.id)} event={event} language={language} />)}</div></Card></section>;
}

function HarvestRow({ event, language }: { event: Record<string, unknown>; language: 'en' | 'te' }) {
  const lines = Array.isArray(event.lines) ? event.lines as Array<Record<string, unknown>> : [];
  const totalKg = lines.reduce((sum, line) => sum + numericValue(line.quantityKg), 0);
  return <Card className="card-pad"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{language === 'te' ? 'కోత' : 'Harvest'} · {shortDate(event.harvestDate)}</p><p className="muted mt-1">{friendly(event.method ?? event.type ?? 'Partial', language)} · {friendly(event.reason ?? 'Harvest sale', language)}</p></div><p className="text-lg font-extrabold">{totalKg.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg</p></div><div className="mt-4 grid gap-3">{lines.map((line, index) => <div key={index} className="grid gap-2"><p className="font-extrabold">{line.basis === 'COUNT' ? (language === 'te' ? 'కౌంట్' : 'Count') : (language === 'te' ? 'గ్రేడ్' : 'Grade')} · {friendly(line.key ?? 'Lot', language)}</p><div className="grid grid-cols-2 gap-2"><FigureCard label={language === 'te' ? 'బరువు' : 'Weight'} figure={asFigure(line.quantityKg, 'kg')} /><FigureCard label={language === 'te' ? 'రేటు' : 'Rate'} figure={asFigure(line.ratePerKgPaise, '₹/kg', true)} /></div></div>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><FigureCard label={language === 'te' ? 'స్థూల విలువ' : 'Gross realisation'} figure={asFigure(event.grossValuePaise, '₹', true)} /><FigureCard label={language === 'te' ? 'నికర విలువ' : 'Net realisation'} figure={asFigure(event.netRealisationPaise, '₹', true)} /></div></Card>;
}
function shortDate(value: unknown): string { const date = new Date(String(value ?? '')); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function friendly(value: unknown, language: 'en' | 'te'): string { const text = String(value).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); return language === 'te' ? text : text; }
function numericValue(value: unknown): number {
  const unwrapped = value && typeof value === 'object' && 'value' in value ? (value as { value?: unknown }).value : value;
  const number = typeof unwrapped === 'number' ? unwrapped : Number(unwrapped);
  return Number.isFinite(number) ? number : 0;
}
function asFigure(value: unknown, unit: string, money = false): { value: string; unit: string; status: string } {
  const unwrapped = value && typeof value === 'object' && 'value' in value ? (value as { value?: unknown }).value : value;
  const number = numericValue(unwrapped);
  if (!Number.isFinite(number)) return { value: '—', unit, status: 'NOT_DETERMINABLE' };
  const formatted = money ? `₹${(number / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : number.toLocaleString('en-IN', { maximumFractionDigits: 3 });
  return { value: formatted, unit: money ? '' : unit, status: 'DETERMINED' };
}
