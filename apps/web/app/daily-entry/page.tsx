'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../src/lib/api';
import type { components } from '../../src/lib/api.generated';
import { useI18n } from '../../src/lib/i18n';
import { ChoiceToggle, Disclosure, Field, SelectField } from '../../src/components/design-system';
import { saveFeedEntry, saveGrowthSample } from '../../src/lib/entry-actions';

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
  const [kind, setKind] = useState<Kind>((params.get('kind') as Kind) || 'feed');
  const [pondId, setPondId] = useState(params.get('pondId') ?? '');
  const [cropId, setCropId] = useState(params.get('cropId') ?? '');
  const [message, setMessage] = useState('');
  const [feed, setFeed] = useState<Feed>({ logDate: date(), mealSlot: new Date().getHours() < 14 ? 'MORNING' : 'EVENING', feedItemId: '', quantityKg: '' });
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
      const active = ponds.data?.filter((pond) => pond.activeCrop);
      if (active?.length === 1 && active[0].activeCrop) {
        setPondId(active[0].id);
        setCropId(active[0].activeCrop.id);
      }
    }
  }, [cropId, ponds.data]);
  useEffect(() => {
    const active = ponds.data?.find((pond) => pond.id === pondId);
    if (active?.activeCrop && active.activeCrop.id !== cropId) setCropId(active.activeCrop.id);
  }, [pondId, ponds.data, cropId]);
  useEffect(() => {
    if (!cropId || typeof window === 'undefined') return;
    try {
      const previous = JSON.parse(window.localStorage.getItem(`aqua_last_feed_${cropId}`) ?? 'null') as Feed | null;
      if (previous) setFeed({ ...previous, logDate: date() });
    } catch { /* ignore an unreadable local default */ }
  }, [cropId]);
  function select(next: Kind) { setKind(next); setMessage(''); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (!cropId || !pondId) throw new Error(t.openActiveCrop);
      if (kind === 'feed') {
        await saveFeedEntry(cropId, feed);
        window.localStorage.setItem(`aqua_last_feed_${cropId}`, JSON.stringify(feed));
      }
      if (kind === 'growth') await saveGrowthSample(cropId, growth);
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
  const secondary = kind !== 'feed';
  return <section className="rise">
    <div className="flex items-end justify-between gap-3"><div><p className="muted text-xs font-extrabold uppercase tracking-[.16em]">{t.dailyEntryPlain}</p><h1 className="display-title">{t.daily}</h1><p className="muted mt-2">{t.valuesServer}</p></div><Link href="/daily-entry/bulk" className="text-sm font-bold text-primary">{t.bulkFeed}</Link></div>
    <div className="pond-context mt-5"><div><p className="muted text-xs font-bold">{t.pond}</p><p className="mt-1 font-extrabold">{activePond ? `${activePond.name} · ${activePond.activeCrop?.code ?? ''}` : t.choosePond}</p></div><SelectField label={t.change} value={pondId} onChange={setPondId} options={(ponds.data ?? []).filter((pond) => pond.activeCrop).map((pond) => ({ value: pond.id, label: `${pond.name} (${pond.code})` }))} /></div>
    <p className="muted mt-2 text-sm">{t.previousValues}</p>
    <ChoiceToggle label={t.mealSlot} value={feed.mealSlot} onChange={(value) => setFeed({ ...feed, mealSlot: value })} options={[{ value: 'MORNING', label: t.morning }, { value: 'EVENING', label: t.evening }]} />
    <div className="card card-pad mt-5 max-w-2xl"><div className="flex items-center justify-between gap-3"><h2 className="section-title">{kind === 'feed' ? t.feed : t.secondaryEntry}</h2><span className="chip">{kind === 'feed' ? t.primary : t.secondary}</span></div><form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
      {kind === 'feed' ? <><Field label={t.date} type="date" value={feed.logDate} onChange={(value) => setFeed({ ...feed, logDate: value })} /><SelectField label={t.feedItem} required value={feed.feedItemId} onChange={(value) => setFeed({ ...feed, feedItemId: value })} options={(feedItems.data ?? []).map((item) => ({ value: item.id, label: `${item.brand} · ${item.gradeCode}` }))} /><Field label={t.quantityKg} value={feed.quantityKg} onChange={(value) => setFeed({ ...feed, quantityKg: value })} required /><SaveButton t={t} extra={<button type="button" onClick={sameYesterday} className="secondary-button">{t.sameYesterday}</button>} /></> : <SecondaryFields kind={kind} growth={growth} setGrowth={setGrowth} water={water} setWater={setWater} medicine={medicine} setMedicine={setMedicine} health={health} setHealth={setHealth} tray={tray} setTray={setTray} medicineItems={medicineItems.data ?? []} trays={trays.data ?? []} t={t} />}
    </form></div>
    <Disclosure label={t.moreDetails} summary={secondary ? t.secondaryModeSelected : t.otherModes}><div className="mt-3 grid gap-2 sm:grid-cols-5">{(['growth', 'water', 'medicine', 'health', 'tray'] as Kind[]).map((item) => <button type="button" key={item} onClick={() => select(item)} className={`secondary-button ${kind === item ? 'bg-primary text-onPrimary' : ''}`}>{t[item === 'tray' ? 'checkTray' : item]}</button>)}</div></Disclosure>
    {message && <p className="mt-4 rounded-lg bg-info/10 p-3 text-sm text-info">{message}</p>}
  </section>;
}

function SecondaryFields({ kind, growth, setGrowth, water, setWater, medicine, setMedicine, health, setHealth, tray, setTray, medicineItems, trays, t }: any) {
  if (kind === 'growth') return <><Field label={t.sampleDate} type="date" value={growth.sampledOn} onChange={(value) => setGrowth({ ...growth, sampledOn: value })} /><Field label={t.sampleWeight} value={growth.sampleWeightG} onChange={(value) => setGrowth({ ...growth, sampleWeightG: value })} required /><Disclosure label={t.technicalDetails}><div className="grid gap-4 sm:grid-cols-2"><Field label={t.doc} type="number" value={String(growth.doc)} onChange={(value) => setGrowth({ ...growth, doc: Number(value) })} /><Field label={t.animalsSample} type="number" value={String(growth.animalsInSample)} onChange={(value) => setGrowth({ ...growth, animalsInSample: Number(value) })} /></div></Disclosure><SaveButton t={t} /></>;
  if (kind === 'water') return <><Field label={t.readAt} type="datetime-local" value={water.readAt.slice(0, 16)} onChange={(value) => setWater({ ...water, readAt: value })} /><Field label={t.ph} value={water.ph ?? ''} onChange={(value) => setWater({ ...water, ph: value })} /><Field label={t.doMgl} value={water.doMgl ?? ''} onChange={(value) => setWater({ ...water, doMgl: value })} /><Disclosure label={t.technicalDetails}><div className="grid gap-4 sm:grid-cols-2"><ChoiceToggle label={t.slot} value={water.slot} onChange={(value) => setWater({ ...water, slot: value })} options={[{ value: 'MORNING', label: t.morning }, { value: 'EVENING', label: t.evening }]} /><Field label={t.source} value={water.source} onChange={(value) => setWater({ ...water, source: value })} /><Field label={t.temperature} value={water.temperatureC ?? ''} onChange={(value) => setWater({ ...water, temperatureC: value })} /></div></Disclosure><SaveButton t={t} /></>;
  if (kind === 'medicine') return <><Field label={t.date} type="date" value={medicine.appliedOn} onChange={(value) => setMedicine({ ...medicine, appliedOn: value })} /><SelectField label={t.medicineItem} required value={medicine.medicineItemId} onChange={(value) => setMedicine({ ...medicine, medicineItemId: value })} options={medicineItems.map((item: MedicineItem) => ({ value: item.id, label: `${item.name} · ${item.unit}` }))} /><Field label={t.quantity} value={medicine.quantity} onChange={(value) => setMedicine({ ...medicine, quantity: value })} required /><Disclosure label={t.technicalDetails}><div className="grid gap-4 sm:grid-cols-2"><Field label={t.unit} value={medicine.unit} onChange={(value) => setMedicine({ ...medicine, unit: value })} /><Field label={t.method} value={medicine.method} onChange={(value) => setMedicine({ ...medicine, method: value })} /><Field label={t.reason} value={medicine.reason} onChange={(value) => setMedicine({ ...medicine, reason: value })} /><Field label={t.amountRupees} value={medicine.costPaise} onChange={(value) => setMedicine({ ...medicine, costPaise: value })} /></div></Disclosure><SaveButton t={t} /></>;
  if (kind === 'health') return <><Field label={t.eventDate} type="date" value={health.eventDate} onChange={(value) => setHealth({ ...health, eventDate: value })} /><Field label={t.symptoms} value={health.symptoms.join(', ')} onChange={(value) => setHealth({ ...health, symptoms: value.split(',').map((item: string) => item.trim()).filter(Boolean) })} /><Disclosure label={t.technicalDetails}><div className="grid gap-4 sm:grid-cols-2"><Field label={t.doc} type="number" value={String(health.doc)} onChange={(value) => setHealth({ ...health, doc: Number(value) })} /><Field label={t.mortality} type="number" value={String(health.mortalityCount ?? 0)} onChange={(value) => setHealth({ ...health, mortalityCount: Number(value) })} /><label className="field-label"><span>{t.labTested}</span><input type="checkbox" checked={health.labTested} onChange={(event) => setHealth({ ...health, labTested: event.target.checked })} /></label></div></Disclosure><SaveButton t={t} /></>;
  return <><SelectField label={t.trayId} required value={tray.checkTrayId} onChange={(value) => setTray({ ...tray, checkTrayId: value })} options={trays.map((item: Tray) => ({ value: item.id, label: `${item.trayCode}${item.position ? ` · ${item.position}` : ''}` }))} /><Field label={t.feedPlaced} value={tray.feedPlacedKg} onChange={(value) => setTray({ ...tray, feedPlacedKg: value })} required /><Disclosure label={t.technicalDetails}><div className="grid gap-4 sm:grid-cols-2"><Field label={t.readAt} type="datetime-local" value={tray.readAt.slice(0, 16)} onChange={(value) => setTray({ ...tray, readAt: value })} /><Field label={t.verdict} value={tray.residualCode} onChange={(value) => setTray({ ...tray, residualCode: value })} /><Field label={t.residualWeight} value={tray.residualWeightG ?? ''} onChange={(value) => setTray({ ...tray, residualWeightG: value })} /></div></Disclosure><SaveButton t={t} /></>;
}

function SaveButton({ t, extra }: { t: any; extra?: ReactNode }) { return <div className="sm:col-span-2 flex flex-wrap gap-3"><button type="submit" className="primary-button">{t.saveEntry}</button>{extra}</div>; }
