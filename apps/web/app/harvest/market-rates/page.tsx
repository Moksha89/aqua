'use client';

import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../src/lib/api';
import { Card, EmptyState, Field, PageHeader, ActionButton } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';

export default function MarketRatesPage() {
  const { language } = useI18n();
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [region, setRegion] = useState('Nellore');
  const [speciesId, setSpeciesId] = useState('');
  const [basis, setBasis] = useState('COUNT');
  const [key, setKey] = useState('30');
  const [rate, setRate] = useState('');
  const rates = useQuery({ queryKey: ['market-rates'], queryFn: () => apiGet<Array<{ id: string; rateDate: string; region: string; basis: string; key: string; ratePerKgPaise: string }>>('/masters/market-rates') });
  const species = useQuery({ queryKey: ['market-rate-species'], queryFn: () => apiGet<Array<{ id: string; name: string }>>('/masters/species') });
  async function save(event: FormEvent) { event.preventDefault(); try { await apiRequest('/masters/market-rates', { method: 'POST', body: JSON.stringify({ rateDate: date, region, speciesId, basis, key, ratePerKgPaise: String(Math.round(Number(rate) * 100)) }) }); setMessage(language === 'te' ? 'మార్కెట్ రేటు సేవ్ అయింది.' : 'Market rate saved.'); rates.refetch(); } catch { setMessage(language === 'te' ? 'రేటు సేవ్ కాలేదు.' : 'Unable to save market rate.'); } }
  return <section className="rise"><PageHeader eyebrow={language === 'te' ? 'కోత' : 'Harvest'} title={language === 'te' ? 'మార్కెట్ రేట్లు' : 'Market rates'} subtitle={language === 'te' ? 'తేదీ, కౌంట్ లేదా గ్రేడ్ ఆధారంగా రేటు కార్డులను నిర్వహించండి.' : 'Review dated species and count or grade rate cards.'} /><div className="grid gap-5 lg:grid-cols-2"><Card className="card-pad"><h2 className="section-title">{language === 'te' ? 'రేటు కార్డులు' : 'Rate cards'}</h2>{rates.data?.length === 0 ? <EmptyState title={language === 'te' ? 'రేట్లు లేవు' : 'No market rates yet'} body={language === 'te' ? 'మొదటి రేటు కార్డును జోడించండి.' : 'Add the first dated rate card.'} /> : <div className="mt-3 grid gap-3">{(rates.data ?? []).map((item) => <Card className="card-pad" key={item.id}><div className="flex justify-between gap-3"><div><p className="font-extrabold">{item.region} · {item.basis === 'COUNT' ? 'Count' : 'Grade'} {item.key}</p><p className="muted mt-1">{shortDate(item.rateDate)}</p></div><p className="font-extrabold">₹{(Number(item.ratePerKgPaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/kg</p></div></Card>)}</div>}</Card><Card className="card-pad"><h2 className="section-title">{language === 'te' ? 'కొత్త రేటు' : 'Add market rate'}</h2><form onSubmit={save} className="mt-3 grid gap-3"><Field label={language === 'te' ? 'తేదీ' : 'Rate date'} type="date" value={date} onChange={setDate} required /><Field label={language === 'te' ? 'ప్రాంతం' : 'Region'} value={region} onChange={setRegion} required /><label className="field-label">{language === 'te' ? 'జాతి' : 'Species'}<select className="field-input" value={speciesId} onChange={(event) => setSpeciesId(event.target.value)} required><option value="">Select species</option>{(species.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field-label">{language === 'te' ? 'ఆధారం' : 'Basis'}<select className="field-input" value={basis} onChange={(event) => setBasis(event.target.value)}><option value="COUNT">Count</option><option value="GRADE">Grade</option></select></label><Field label={basis === 'COUNT' ? 'Count' : 'Grade'} value={key} onChange={setKey} required /><Field label={language === 'te' ? 'రేటు (₹/kg)' : 'Rate (₹/kg)'} value={rate} onChange={setRate} required /><ActionButton type="submit">{language === 'te' ? 'సేవ్ చేయండి' : 'Save rate'}</ActionButton>{message && <p className="text-primary">{message}</p>}</form></Card></div></section>;
}
function shortDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
