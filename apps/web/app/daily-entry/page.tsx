'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../src/lib/api';
import type { components } from '../../src/lib/api.generated';
import { useI18n } from '../../src/lib/i18n';

type Kind = 'feed' | 'growth' | 'water' | 'medicine' | 'health' | 'tray';
type Pond = components['schemas']['PondListItemDto'];
type Feed = components['schemas']['FeedDto'];
type Growth = components['schemas']['GrowthDto'];
type Water = components['schemas']['WaterDto'];
type Medicine = components['schemas']['MedicineDto'];
type Health = components['schemas']['HealthDto'];
type TrayReading = components['schemas']['TrayReadingDto'];
type FeedItem = components['schemas']['FeedItemOptionDto'];
type MedicineItem = components['schemas']['MedicineItemOptionDto'];
type Tray = components['schemas']['CheckTrayOptionDto'];
const date = () => new Date().toISOString().slice(0, 10);
const timestamp = () => new Date().toISOString().slice(0, 16);

export default function DailyEntryPage() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [kind, setKind] = useState<Kind>('feed');
  const [pondId, setPondId] = useState(params.get('pondId') ?? '');
  const [cropId, setCropId] = useState(params.get('cropId') ?? '');
  const [message, setMessage] = useState('');
  const [feed, setFeed] = useState<Feed>({ logDate: date(), mealSlot: 'MORNING', feedItemId: '', quantityKg: '' });
  const [growth, setGrowth] = useState<Growth>({ sampledOn: date(), doc: 0, animalsInSample: 0, sampleWeightG: '' });
  const [water, setWater] = useState<Water>({ readAt: timestamp(), slot: 'MORNING', source: 'POND', ph: '', doMgl: '', temperatureC: '' });
  const [medicine, setMedicine] = useState<Medicine>({ appliedOn: date(), medicineItemId: '', quantity: '', unit: 'KG', method: 'POND', reason: '', costPaise: '0' });
  const [health, setHealth] = useState<Health>({ eventDate: date(), doc: 0, symptoms: [], mortalityCount: 0, labTested: false });
  const [tray, setTray] = useState<TrayReading>({ checkTrayId: '', readAt: timestamp(), feedPlacedKg: '', residualCode: 'OPTIMAL', residualWeightG: '' });
  const ponds = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  const feedItems = useQuery({ queryKey: ['feed-items'], queryFn: () => apiGet<FeedItem[]>('/masters/feed-items') });
  const medicineItems = useQuery({ queryKey: ['medicine-items'], queryFn: () => apiGet<MedicineItem[]>('/masters/medicine-items') });
  const trays = useQuery({ queryKey: ['check-trays', cropId], queryFn: () => apiGet<Tray[]>(`/crops/${cropId}/check-trays`), enabled: Boolean(cropId) });
  useEffect(() => {
    if (!cropId) {
      const active = ponds.data?.find((pond) => pond.activeCrop);
      if (active?.activeCrop) { setPondId(active.id); setCropId(active.activeCrop.id); }
    }
  }, [cropId, ponds.data]);
  useEffect(() => {
    const active = ponds.data?.find((pond) => pond.id === pondId);
    if (active?.activeCrop && active.activeCrop.id !== cropId) setCropId(active.activeCrop.id);
  }, [pondId, ponds.data, cropId]);
  function select(next: Kind) { setKind(next); setMessage(''); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (!cropId || !pondId) throw new Error(t.openActiveCrop);
      if (kind === 'feed') { await apiRequest(`/crops/${cropId}/feed-logs`, { method: 'POST', body: JSON.stringify(feed) }); window.localStorage.setItem(`aqua_last_feed_${cropId}`, JSON.stringify(feed)); }
      if (kind === 'growth') await apiRequest(`/crops/${cropId}/growth-samples`, { method: 'POST', body: JSON.stringify(growth) });
      if (kind === 'water') await apiRequest(`/crops/ponds/${pondId}/water-readings`, { method: 'POST', body: JSON.stringify({ ...water, cropId }) });
      if (kind === 'medicine') await apiRequest(`/crops/${cropId}/medicine-applications`, { method: 'POST', body: JSON.stringify(medicine) });
      if (kind === 'health') await apiRequest(`/crops/${cropId}/health-events`, { method: 'POST', body: JSON.stringify(health) });
      if (kind === 'tray') await apiRequest(`/crops/${cropId}/check-tray-readings`, { method: 'POST', body: JSON.stringify(tray) });
      setMessage(t.saved);
    } catch (error) { setMessage(error instanceof Error ? error.message : t.noData); }
  }
  async function sameYesterday() {
    try { await apiRequest(`/crops/${cropId}/feed-logs/same-as-yesterday`, { method: 'POST', body: JSON.stringify({ date: date() }) }); setMessage(t.sameYesterday); } catch (error) { setMessage(error instanceof Error ? error.message : t.noData); }
  }
  const activePond = ponds.data?.find((pond) => pond.id === pondId);
  return <section><h1 className="text-3xl font-semibold">{t.daily}</h1><p className="mt-2 text-textSecondary">{t.valuesServer}</p><label className="mt-5 block max-w-2xl text-sm text-textSecondary">Pond<select value={pondId} onChange={(event) => setPondId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface p-3 text-textPrimary"><option value="">Select pond</option>{(ponds.data ?? []).filter((pond) => pond.activeCrop).map((pond) => <option key={pond.id} value={pond.id}>{pond.name} ({pond.code})</option>)}</select></label>{activePond?.activeCrop && <p className="mt-2 text-sm text-textSecondary">Crop: {activePond.activeCrop.code}</p>}<div className="mt-5 flex flex-wrap gap-2">{(['feed', 'growth', 'water', 'medicine', 'health', 'tray'] as Kind[]).map((item) => <button key={item} onClick={() => select(item)} className={`rounded-lg border border-border px-3 py-2 text-sm ${kind === item ? 'bg-primary text-onPrimary' : 'bg-surface text-textSecondary'}`}>{t[item === 'tray' ? 'checkTray' : item]}</button>)}</div><form onSubmit={submit} className="mt-5 max-w-2xl rounded-xl border border-border bg-surface p-5"><div className="grid gap-4 sm:grid-cols-2">{kind === 'feed' && <><Field label={t.date} type="date" value={feed.logDate} onChange={(value) => setFeed({ ...feed, logDate: value })} /><Field label={t.mealSlot} value={feed.mealSlot} onChange={(value) => setFeed({ ...feed, mealSlot: value })} /><label className="text-sm text-textSecondary">{t.feedItem}<select required value={feed.feedItemId} onChange={(event) => setFeed({ ...feed, feedItemId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">Select feed</option>{(feedItems.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.brand} · {item.gradeCode}</option>)}</select></label><Field label={t.quantityKg} value={feed.quantityKg} onChange={(value) => setFeed({ ...feed, quantityKg: value })} required /></>}{kind === 'growth' && <><Field label={t.sampleDate} type="date" value={growth.sampledOn} onChange={(value) => setGrowth({ ...growth, sampledOn: value })} /><Field label={t.doc} type="number" value={String(growth.doc)} onChange={(value) => setGrowth({ ...growth, doc: Number(value) })} /><Field label={t.animalsSample} type="number" value={String(growth.animalsInSample)} onChange={(value) => setGrowth({ ...growth, animalsInSample: Number(value) })} /><Field label={t.sampleWeight} value={growth.sampleWeightG} onChange={(value) => setGrowth({ ...growth, sampleWeightG: value })} required /></>}{kind === 'water' && <><Field label={t.readAt} type="datetime-local" value={water.readAt.slice(0, 16)} onChange={(value) => setWater({ ...water, readAt: value })} /><Field label={t.slot} value={water.slot} onChange={(value) => setWater({ ...water, slot: value })} /><Field label={t.source} value={water.source} onChange={(value) => setWater({ ...water, source: value })} /><Field label={t.ph} value={water.ph ?? ''} onChange={(value) => setWater({ ...water, ph: value })} /><Field label={t.doMgl} value={water.doMgl ?? ''} onChange={(value) => setWater({ ...water, doMgl: value })} /><Field label={t.temperature} value={water.temperatureC ?? ''} onChange={(value) => setWater({ ...water, temperatureC: value })} /></>}{kind === 'medicine' && <><Field label={t.date} type="date" value={medicine.appliedOn} onChange={(value) => setMedicine({ ...medicine, appliedOn: value })} /><label className="text-sm text-textSecondary">{t.medicineItem}<select required value={medicine.medicineItemId} onChange={(event) => setMedicine({ ...medicine, medicineItemId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">Select medicine</option>{(medicineItems.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.unit}</option>)}</select></label><Field label={t.quantity} value={medicine.quantity} onChange={(value) => setMedicine({ ...medicine, quantity: value })} required /><Field label={t.unit} value={medicine.unit} onChange={(value) => setMedicine({ ...medicine, unit: value })} /><Field label={t.method} value={medicine.method} onChange={(value) => setMedicine({ ...medicine, method: value })} /><Field label={t.reason} value={medicine.reason} onChange={(value) => setMedicine({ ...medicine, reason: value })} /><Field label={t.costPaise} value={medicine.costPaise} onChange={(value) => setMedicine({ ...medicine, costPaise: value })} /></>}{kind === 'health' && <><Field label={t.eventDate} type="date" value={health.eventDate} onChange={(value) => setHealth({ ...health, eventDate: value })} /><Field label={t.doc} type="number" value={String(health.doc)} onChange={(value) => setHealth({ ...health, doc: Number(value) })} /><Field label={t.symptoms} value={health.symptoms.join(', ')} onChange={(value) => setHealth({ ...health, symptoms: value.split(',').map((item) => item.trim()).filter(Boolean) })} /><Field label={t.mortality} type="number" value={String(health.mortalityCount ?? 0)} onChange={(value) => setHealth({ ...health, mortalityCount: Number(value) })} /><label className="flex gap-2 text-sm text-textSecondary"><input type="checkbox" checked={health.labTested} onChange={(event) => setHealth({ ...health, labTested: event.target.checked })} />{t.labTested}</label></>}{kind === 'tray' && <><label className="text-sm text-textSecondary">{t.trayId}<select required value={tray.checkTrayId} onChange={(event) => setTray({ ...tray, checkTrayId: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary"><option value="">Select tray</option>{(trays.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.trayCode}{item.position ? ` · ${item.position}` : ''}</option>)}</select></label><Field label={t.readAt} type="datetime-local" value={tray.readAt.slice(0, 16)} onChange={(value) => setTray({ ...tray, readAt: value })} /><Field label={t.feedPlaced} value={tray.feedPlacedKg} onChange={(value) => setTray({ ...tray, feedPlacedKg: value })} required /><Field label={t.verdict} value={tray.residualCode} onChange={(value) => setTray({ ...tray, residualCode: value })} /><Field label={t.residualWeight} value={tray.residualWeightG ?? ''} onChange={(value) => setTray({ ...tray, residualWeightG: value })} /></>}</div><div className="mt-5 flex flex-wrap gap-3"><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-onPrimary">{t.saveEntry}</button>{kind === 'feed' && <button type="button" onClick={sameYesterday} className="rounded-lg border border-border px-4 py-2 text-textPrimary">{t.sameYesterday}</button>}</div>{message && <p className="mt-4 rounded-lg bg-info/10 p-3 text-sm text-info">{message}</p>}</form></section>;
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-sm text-textSecondary">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary" /></label>;
}
