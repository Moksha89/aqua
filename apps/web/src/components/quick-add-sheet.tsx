'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, getSession } from '../lib/api';
import type { components } from '../lib/api.generated';
import { useI18n } from '../lib/i18n';
import { ChoiceToggle, Disclosure, Field, SelectField } from './design-system';
import { saveExpenseEntry, saveFeedEntry, saveGrowthSample, savePaymentEntry } from '../lib/entry-actions';

type Pond = components['schemas']['PondListItemDto'];
type FeedItem = components['schemas']['FeedItemOptionDto'];
type CostHead = components['schemas']['CostHeadListDto'];
type Party = components['schemas']['PartyListDto'];
type Kind = 'feed' | 'expense' | 'payment' | 'growth';

const today = () => new Date().toISOString().slice(0, 10);
const mealSlot = () => new Date().getHours() < 14 ? 'MORNING' : 'EVENING';

export function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const financial = getSession()?.financialAccess === true;
  const [kind, setKind] = useState<Kind>('feed');
  const [message, setMessage] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pondId, setPondId] = useState('');
  const [cropId, setCropId] = useState('');
  const [feedItemId, setFeedItemId] = useState('');
  const [feedQuantity, setFeedQuantity] = useState('');
  const [feedSlot, setFeedSlot] = useState<'MORNING' | 'EVENING'>(mealSlot());
  const [amount, setAmount] = useState('');
  const [costHeadId, setCostHeadId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK' | 'OTHER'>('CASH');
  const [sampleWeight, setSampleWeight] = useState('');
  const [sampleAnimals, setSampleAnimals] = useState('');
  const ponds = useQuery({ queryKey: ['quick-add-ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  const feedItems = useQuery({ queryKey: ['quick-add-feed-items'], queryFn: () => apiGet<FeedItem[]>('/masters/feed-items') });
  const costHeads = useQuery({ queryKey: ['quick-add-cost-heads'], queryFn: () => apiGet<CostHead[]>('/masters/cost-heads'), enabled: financial });
  const parties = useQuery({ queryKey: ['quick-add-parties'], queryFn: () => apiGet<Party[]>('/masters/parties'), enabled: financial });
  const livePonds = (ponds.data ?? []).filter((pond) => pond.activeCrop);
  const activePond = livePonds.find((pond) => pond.id === pondId);
  const quickKinds: Kind[] = financial ? ['feed', 'expense', 'payment', 'growth'] : ['feed', 'growth'];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedFeed = window.localStorage.getItem('aqua_last_feed_item');
    const savedHead = window.localStorage.getItem('aqua_last_cost_head');
    const savedMode = window.localStorage.getItem('aqua_last_payment_mode');
    if (savedFeed) setFeedItemId(savedFeed);
    if (savedHead) setCostHeadId(savedHead);
    if (savedMode && ['CASH', 'BANK', 'OTHER'].includes(savedMode)) setPaymentMode(savedMode as typeof paymentMode);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined' || !cropId) return;
    const saved = window.localStorage.getItem(`aqua_last_feed_${cropId}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { feedItemId?: string; mealSlot?: 'MORNING' | 'EVENING'; quantityKg?: string };
      if (parsed.feedItemId) setFeedItemId(parsed.feedItemId);
      if (parsed.mealSlot) setFeedSlot(parsed.mealSlot);
      if (parsed.quantityKg) setFeedQuantity(parsed.quantityKg);
    } catch {
    }
  }, [cropId]);
  useEffect(() => {
    if (livePonds.length === 1 && !pondId) {
      setPondId(livePonds[0].id);
      setCropId(livePonds[0].activeCrop?.id ?? '');
    }
  }, [livePonds, pondId]);
  useEffect(() => {
    if (!feedItemId && feedItems.data?.length === 1) setFeedItemId(feedItems.data[0].id);
  }, [feedItemId, feedItems.data]);
  useEffect(() => {
    if (!costHeadId && costHeads.data?.length === 1) setCostHeadId(costHeads.data[0].id);
  }, [costHeadId, costHeads.data]);
  useEffect(() => {
    if (ponds.isFetched && (livePonds.length !== 1 || !pondId) && (kind === 'expense' || kind === 'growth')) setDetailsOpen(true);
    if (kind === 'payment' && parties.isFetched && !partyId) setDetailsOpen(true);
    if (kind === 'feed' && feedItems.isFetched && !feedItemId) setDetailsOpen(true);
  }, [feedItemId, feedItems.isFetched, kind, livePonds.length, partyId, parties.isFetched, pondId, ponds.isFetched]);

  function choosePond(value: string) {
    const pond = livePonds.find((item) => item.id === value);
    setPondId(value);
    setCropId(pond?.activeCrop?.id ?? '');
  }
  function selectKind(value: Kind) {
    setKind(value);
    setMessage('');
    setDetailsOpen(false);
  }
  function missingField(id: string, text: string) {
    setDetailsOpen(true);
    setMessage(text);
    window.setTimeout(() => document.getElementById(id)?.focus(), 0);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (kind !== 'payment' && (!pondId || !cropId)) return missingField('quick-pond', t.choosePond);
    if (kind === 'feed' && (!feedItemId || !feedQuantity)) {
      return missingField(!feedItemId ? 'quick-feed-item' : 'quick-feed-quantity', t.quickChooseFeed);
    }
    if (kind === 'expense' && (!amount || !costHeadId)) {
      return missingField(!amount ? 'quick-amount' : 'quick-cost-head', t.completeDetails);
    }
    if (kind === 'payment' && (!amount || !partyId)) {
      return missingField(!amount ? 'quick-amount' : 'quick-party', t.chooseParty);
    }
    if (kind === 'growth' && (!sampleWeight || !sampleAnimals)) {
      return missingField(!sampleWeight ? 'quick-sample-weight' : 'quick-sample-animals', t.quickChooseSample);
    }
    try {
      if (kind === 'feed') {
        await saveFeedEntry(cropId, { logDate: today(), mealSlot: feedSlot, feedItemId, quantityKg: feedQuantity });
        window.localStorage.setItem('aqua_last_feed_item', feedItemId);
        window.localStorage.setItem(`aqua_last_feed_${cropId}`, JSON.stringify({ feedItemId, mealSlot: feedSlot, quantityKg: feedQuantity }));
      } else if (kind === 'expense') {
        await saveExpenseEntry({ expenseDate: today(), costHeadId, allocationTarget: 'POND_CROP', pondId, cropId, amountPaise: amount, paymentStatus: 'PAID' });
        window.localStorage.setItem('aqua_last_cost_head', costHeadId);
      } else if (kind === 'payment') {
        await savePaymentEntry({ partyId, paidOn: today(), direction: 'PAYABLE', amountPaise: amount, mode: paymentMode });
        window.localStorage.setItem('aqua_last_payment_mode', paymentMode);
      } else {
        await saveGrowthSample(cropId, { sampledOn: today(), doc: Number(activePond?.activeCrop?.doc.value ?? 0), animalsInSample: Number(sampleAnimals), sampleWeightG: sampleWeight });
      }
      setMessage(t.quickSaved);
      setAmount('');
      setFeedQuantity('');
      setSampleWeight('');
      setSampleAnimals('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.quickSaveFailed);
    }
  }

  const summary = kind === 'feed'
    ? `${t.feed} · ${feedItems.data?.find((item) => item.id === feedItemId)?.brand ?? t.chooseDetails} · ${activePond?.name ?? t.choosePond}`
    : kind === 'expense'
      ? `${t.expense} · ${costHeads.data?.find((item) => item.id === costHeadId)?.name ?? t.chooseDetails} · ${activePond?.name ?? t.choosePond}`
      : kind === 'payment'
        ? `${t.payment} · ${parties.data?.find((party) => party.id === partyId)?.name ?? t.chooseParty} · ${paymentMode === 'CASH' ? t.cash : paymentMode === 'BANK' ? t.bank : t.other}`
        : `${t.growth} · ${activePond?.name ?? t.choosePond}`;

  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="quick-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
      <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{t.quickAdd}</p><h2 id="quick-add-title" className="display-title">{t.quickAddTitle}</h2></div><button type="button" className="header-icon" aria-label={t.close} onClick={onClose}>×</button></div>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {quickKinds.map((item) => <button type="button" key={item} className={`quick-kind tap ${kind === item ? 'active' : ''}`} onClick={() => selectKind(item)}><i className={`ph-duotone ${item === 'feed' ? 'ph-bowl-food' : item === 'expense' ? 'ph-receipt' : item === 'payment' ? 'ph-money' : 'ph-chart-line-up'}`} /><span>{t[item === 'expense' ? 'spending' : item === 'payment' ? 'paymentOut' : item]}</span></button>)}
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        {kind === 'feed' && <><Field label={t.quantityKg} value={feedQuantity} onChange={setFeedQuantity} required /><SelectField label={t.feedItem} value={feedItemId} onChange={setFeedItemId} options={(feedItems.data ?? []).map((item) => ({ value: item.id, label: `${item.brand} · ${item.gradeCode}` }))} required /><ChoiceToggle label={t.mealSlot} value={feedSlot} onChange={setFeedSlot} options={[{ value: 'MORNING', label: t.morning }, { value: 'EVENING', label: t.evening }]} /></>}
        {kind === 'expense' && <Field label={t.amountRupees} value={amount} onChange={setAmount} required />}
        {kind === 'payment' && <Field label={t.amountRupees} value={amount} onChange={setAmount} required />}
        {kind === 'growth' && <Field label={t.sampleWeight} value={sampleWeight} onChange={setSampleWeight} required />}
        <Disclosure label={t.quickDetails} open={detailsOpen} onOpenChange={setDetailsOpen} summary={summary}>
          <div className="mt-3 grid gap-4">
            {kind !== 'payment' && <SelectField label={t.pond} value={pondId} onChange={choosePond} options={livePonds.map((pond) => ({ value: pond.id, label: pond.name }))} required hint={livePonds.length > 1 ? t.quickChoosePond : undefined} />}
            {kind === 'expense' && <SelectField label={t.costHead} value={costHeadId} onChange={setCostHeadId} options={(costHeads.data ?? []).map((head) => ({ value: head.id, label: head.name }))} required />}
            {kind === 'payment' && <><SelectField label={t.party} value={partyId} onChange={setPartyId} options={(parties.data ?? []).map((party) => ({ value: party.id, label: party.name }))} required /><ChoiceToggle label={t.mode} value={paymentMode} onChange={setPaymentMode} options={[{ value: 'CASH', label: t.cash }, { value: 'BANK', label: t.bank }, { value: 'OTHER', label: t.other }]} /></>}
            {kind === 'growth' && <Field label={t.animalsSample} type="number" value={sampleAnimals} onChange={setSampleAnimals} required />}
          </div>
        </Disclosure>
        <button type="submit" className="primary-button">{t.saveEntry}</button>
        {message && <p className="rounded-lg bg-info/10 p-3 text-sm text-info">{message}</p>}
      </form>
    </section>
  </div>;
}
