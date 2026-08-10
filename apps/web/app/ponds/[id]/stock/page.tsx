'use client';

import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../../src/lib/api';
import { ActionButton, Card, ChoiceToggle, Disclosure, Field, PageHeader, SelectField } from '../../../../src/components/design-system';
import { useI18n } from '../../../../src/lib/i18n';
import { rupeesToPaise } from '../../../../src/lib/money';

type Species = { id: string; name: string; category: string };

export default function StockPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { language, t } = useI18n();
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
  return <div className="rise"><PageHeader eyebrow={t.newCrop} title={t.stockPond} subtitle={t.stockHint} /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><ChoiceToggle label={t.speciesCategory} value={category} onChange={setCategory} options={[{ value: 'SHRIMP', label: te ? 'రొయ్యలు' : 'Shrimp' }, { value: 'FISH', label: te ? 'చేపలు' : 'Fish' }]} /><SelectField label={t.species} required value={speciesId} onChange={setSpeciesId} options={(species.data ?? []).filter((item) => item.category === category || !item.category).map((item) => ({ value: item.id, label: item.name }))} /><Field label={t.stockedOn} type="date" value={stockedOn} onChange={setStockedOn} required /><Field label={t.quantityPieces} type="number" value={quantity} onChange={setQuantity} required /><Disclosure label={t.costDetailsPlain}><div className="grid grid-cols-2 gap-3"><Field label={t.ratePerPiece} value={rate} onChange={setRate} required /><Field label={t.seedCost} value={seedCost} onChange={setSeedCost} required /><Field label={t.transportCost} value={transport} onChange={setTransport} required /></div></Disclosure><ActionButton type="submit">{t.stockPond}</ActionButton>{message && <p className="text-sm text-danger">{message}</p>}</form></Card></div>;
}
