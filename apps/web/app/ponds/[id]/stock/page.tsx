'use client';

import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../../../src/components/design-system';
import { useI18n } from '../../../../src/lib/i18n';
import { rupeesToPaise } from '../../../../src/lib/money';

type Species = { id: string; name: string; category: string };

export default function StockPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useI18n();
  const species = useQuery({ queryKey: ['species'], queryFn: () => apiGet<Species[]>('/masters/species') });
  const [speciesId, setSpeciesId] = useState('');
  const [category, setCategory] = useState('SHRIMP');
  const [stockedOn, setStockedOn] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [seedCost, setSeedCost] = useState('0');
  const [transport, setTransport] = useState('0');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/ponds/${id}/stock`, { method: 'POST', body: JSON.stringify({ speciesCategory: category, batches: [{ speciesId, stockedOn, quantityPieces: quantity, ratePaise: rupeesToPaise(rate), seedCostPaise: rupeesToPaise(seedCost), transportCostPaise: rupeesToPaise(transport) }] }) });
      router.replace(`/ponds/${id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to stock pond'); }
  }
  const te = language === 'te';
  return <div className="rise"><PageHeader eyebrow={te ? 'కొత్త పంట' : 'New crop'} title={te ? 'ఈ చెరువులో స్టాక్ చేయండి' : 'Stock this pond'} subtitle={te ? 'సర్వర్ జాతి ఎంపికతో విత్తన బ్యాచ్‌ను నమోదు చేయండి.' : 'Use a server-backed species picker and record the seed batch.'} /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><label className="field-label">{te ? 'జాతి వర్గం' : 'Species category'}<select className="field-input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="SHRIMP">{te ? 'రొయ్యలు' : 'Shrimp'}</option><option value="FISH">{te ? 'చేపలు' : 'Fish'}</option></select></label><label className="field-label">{te ? 'జాతి' : 'Species'}<select className="field-input" required value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}><option value="">{te ? 'జాతిని ఎంచుకోండి' : 'Select species'}</option>{(species.data ?? []).filter((item) => item.category === category || !item.category).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Field label={te ? 'స్టాక్ తేదీ' : 'Stocked on'} type="date" value={stockedOn} onChange={setStockedOn} required /><Field label={te ? 'పరిమాణం (ముక్కలు)' : 'Quantity (pieces)'} type="number" value={quantity} onChange={setQuantity} required /><Field label={te ? 'రేటు (₹/ముక్క)' : 'Rate (₹/piece)'} value={rate} onChange={setRate} required /><div className="grid grid-cols-2 gap-3"><Field label={te ? 'విత్తన ఖర్చు (₹)' : 'Seed cost (₹)'} value={seedCost} onChange={setSeedCost} required /><Field label={te ? 'రవాణా (₹)' : 'Transport (₹)'} value={transport} onChange={setTransport} required /></div><ActionButton type="submit">{te ? 'చెరువులో స్టాక్ చేయండి' : 'Stock pond'}</ActionButton>{message && <p className="text-sm text-danger">{message}</p>}</form></Card></div>;
}
