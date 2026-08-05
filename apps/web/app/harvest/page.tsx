'use client';

import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../src/lib/api';
import type { components } from '../../src/lib/api.generated';
import { useI18n } from '../../src/lib/i18n';

type Pond = components['schemas']['PondListItemDto'];
type Harvest = components['schemas']['HarvestDto'];
type CloseResponse = components['schemas']['CloseCropResponseDto'];

export default function HarvestPage() {
  const { t } = useI18n();
  const params = useSearchParams();
  const ponds = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  const [cropId, setCropId] = useState(params.get('cropId') ?? '');
  const [sampleTaken, setSampleTaken] = useState(false);
  const [message, setMessage] = useState('');
  const [closed, setClosed] = useState<CloseResponse | null>(null);
  const [zeroCostHeads, setZeroCostHeads] = useState<string[]>([]);
  const [harvest, setHarvest] = useState<Harvest>({ harvestDate: new Date().toISOString().slice(0, 10), doc: 0, type: 'FINAL', reason: 'TARGET_SIZE', sampleTaken: false, lines: [{ basis: 'COUNT', key: '', quantityKg: '', ratePerKgPaise: '' }] });
  const active = (ponds.data ?? []).find((pond) => pond.activeCrop?.id === cropId)?.activeCrop;
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/crops/${cropId}/harvests`, { method: 'POST', body: JSON.stringify({ ...harvest, sampleTaken, sampleCount: sampleTaken ? harvest.sampleCount : undefined, sampleWeightG: sampleTaken ? harvest.sampleWeightG : undefined }) });
      setMessage(t.harvestSaved);
    } catch (error) { setMessage(error instanceof Error ? error.message : t.harvestGuidance); }
  }
  async function startClosure() {
    try {
      await apiRequest(`/crops/${cropId}/closure-checklist`, { method: 'POST', body: JSON.stringify({}) });
      setMessage(t.checklistReady);
    } catch (error) { setMessage(error instanceof Error ? error.message : t.closureFailed); }
  }
  async function completeClosure(acknowledge = zeroCostHeads) {
    try {
      for (const step of ['CONFIRM_HARVESTS', 'ZERO_COST_HEADS', 'RECONCILE_FEED_STOCK', 'POST_OCCUPANCY_COSTS', 'CLOSURE_ALLOCATION']) {
        const note = step === 'ZERO_COST_HEADS' && acknowledge.length > 0 ? `ACK_ZERO:${acknowledge.join(',')}` : step === 'RECONCILE_FEED_STOCK' ? 'WRITE_OFF:No remaining stock' : undefined;
        await apiRequest(`/crops/${cropId}/closure-checklist/${step}`, { method: 'POST', body: JSON.stringify({ note }) });
      }
      const result = await apiRequest<CloseResponse>(`/crops/${cropId}/close`, { method: 'POST', body: JSON.stringify({}) });
      setClosed(result); setZeroCostHeads([]); setMessage(t.pnlFrozen);
    } catch (error) {
      const text = error instanceof Error ? error.message : '';
      const match = text.match(/Acknowledge zero-value cost heads:\s*(.+)$/);
      if (match) { setZeroCostHeads(match[1].split(',').map((value) => value.trim()).filter(Boolean)); setMessage(t.zeroCostHeadsGuidance); }
      else setMessage(text || t.closureFailed);
    }
  }
  if (!cropId) return <section><h1 className="text-3xl font-semibold">{t.harvestClosure}</h1><p className="mt-4 text-textSecondary">{t.selectCrop}</p><select value={cropId} onChange={(event) => setCropId(event.target.value)} className="mt-4 rounded-lg border border-border bg-surface p-3">{(ponds.data ?? []).filter((pond) => pond.activeCrop).map((pond) => <option key={pond.activeCrop!.id} value={pond.activeCrop!.id}>{pond.name} · {pond.activeCrop!.code}</option>)}</select></section>;
  return <section><h1 className="text-3xl font-semibold">{t.harvestClosure}</h1><p className="mt-2 text-textSecondary">{t.harvestGuidance}</p>{active?.status === 'CLOSED' ? <p className="mt-5 rounded-lg bg-warning/10 p-4 text-warning">{t.closedReadOnly}</p> : <form onSubmit={submit} className="mt-6 max-w-3xl rounded-xl border border-border bg-surface p-5"><div className="grid gap-3 sm:grid-cols-2"><Field label={t.harvestDate} type="date" value={harvest.harvestDate} onChange={(value) => setHarvest({ ...harvest, harvestDate: value })} /><Field label={t.doc} type="number" value={String(harvest.doc)} onChange={(value) => setHarvest({ ...harvest, doc: Number(value) })} /><SelectField label={t.harvestType} value={harvest.type} options={['PARTIAL', 'FINAL']} onChange={(value) => setHarvest({ ...harvest, type: value as Harvest['type'] })} /><SelectField label={t.harvestReason} value={harvest.reason} options={['TARGET_SIZE', 'MARKET_RATE', 'DISEASE', 'SEASON_END', 'OTHER']} onChange={(value) => setHarvest({ ...harvest, reason: value as Harvest['reason'] })} /></div><label className="mt-4 flex gap-2 text-sm text-textSecondary"><input type="checkbox" checked={sampleTaken} onChange={(event) => { setSampleTaken(event.target.checked); setHarvest({ ...harvest, sampleTaken: event.target.checked }); }} />{t.sampleTaken}</label>{sampleTaken && <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label={t.sampleCount} type="number" value={String(harvest.sampleCount ?? '')} onChange={(value) => setHarvest({ ...harvest, sampleCount: Number(value) })} /><Field label={t.sampleWeight} value={harvest.sampleWeightG ?? ''} onChange={(value) => setHarvest({ ...harvest, sampleWeightG: value })} /></div>}<div className="mt-4 rounded-lg border border-border p-4"><p className="text-sm text-textSecondary">{t.harvestLinesGuidance}</p><div className="mt-3 grid gap-3 sm:grid-cols-4"><Field label={t.basis} value={harvest.lines[0].basis} onChange={(value) => setHarvest({ ...harvest, lines: [{ ...harvest.lines[0], basis: value as 'COUNT' | 'GRADE' }] })} /><Field label={t.lineKey} value={harvest.lines[0].key} onChange={(value) => setHarvest({ ...harvest, lines: [{ ...harvest.lines[0], key: value }] })} /><Field label={t.quantityKg} value={harvest.lines[0].quantityKg} onChange={(value) => setHarvest({ ...harvest, lines: [{ ...harvest.lines[0], quantityKg: value }] })} /><Field label={t.ratePaise} value={harvest.lines[0].ratePerKgPaise} onChange={(value) => setHarvest({ ...harvest, lines: [{ ...harvest.lines[0], ratePerKgPaise: value }] })} /></div></div><button className="mt-5 rounded-lg bg-primary px-4 py-2 text-onPrimary" type="submit">{t.saveHarvest}</button></form>}{message && <p className="mt-4 rounded-lg bg-info/10 p-3 text-info">{message}</p>}<div className="mt-8 rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-semibold">{t.closureChecklist}</h2><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={startClosure} className="rounded-lg border border-border px-4 py-2">{t.startChecklist}</button><button type="button" onClick={() => completeClosure()} className="rounded-lg bg-primary px-4 py-2 text-onPrimary">{t.completeClosure}</button>{zeroCostHeads.length > 0 && <div className="mt-4 basis-full rounded-lg bg-warning/10 p-4 text-warning"><p>{t.zeroCostHeadsGuidance}</p><button type="button" onClick={() => completeClosure(zeroCostHeads)} className="mt-3 rounded-lg bg-warning px-4 py-2 text-onPrimary">{t.acknowledgeZeroCostHeads}</button></div>}</div>{closed?.pnlFrozen && <p className="mt-4 text-success">{t.pnlFrozen}</p>}</div></section>;
}

function SelectField({ label, value, options, onChange, language = 'en' }: { label: string; value: string; options: string[]; onChange: (value: string) => void; language?: 'en' | 'te' }) { return <label className="text-sm text-textSecondary">{label}<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary">{options.map((option) => <option key={option} value={option}>{optionLabel(option, language)}</option>)}</select></label>; }

function optionLabel(value: string, language: 'en' | 'te'): string {
  const labels: Record<string, [string, string]> = {
    PARTIAL: ['Partial harvest', 'పాక్షిక కోత'],
    FINAL: ['Final harvest', 'చివరి కోత'],
    TARGET_SIZE: ['Target size', 'లక్ష్య పరిమాణం'],
    MARKET_RATE: ['Market rate', 'మార్కెట్ రేటు'],
    DISEASE: ['Disease', 'వ్యాధి'],
    SEASON_END: ['Season end', 'సీజన్ ముగింపు'],
    OTHER: ['Other', 'ఇతరం'],
    COUNT: ['Count', 'కౌంట్'],
    GRADE: ['Grade', 'గ్రేడ్'],
  };
  return labels[value]?.[language === 'te' ? 1 : 0] ?? value.replace(/_/g, ' ').toLowerCase();
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="text-sm text-textSecondary">{label}<input required value={value} type={type} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-textPrimary" /></label>; }
