'use client';

import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../../../src/components/design-system';

type Species = { id: string; name: string; category: string };

export default function StockPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
      await apiRequest(`/ponds/${id}/stock`, { method: 'POST', body: JSON.stringify({ speciesCategory: category, batches: [{ speciesId, stockedOn, quantityPieces: quantity, ratePaise: rate, seedCostPaise: seedCost, transportCostPaise: transport }] }) });
      router.replace(`/ponds/${id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to stock pond'); }
  }
  return <div className="rise"><PageHeader eyebrow="New crop" title="Stock this pond" subtitle="Use a server-backed species picker and record the seed batch." /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><label className="field-label">Species category<select className="field-input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="SHRIMP">Shrimp</option><option value="FISH">Fish</option></select></label><label className="field-label">Species<select className="field-input" required value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}><option value="">Select species</option>{(species.data ?? []).filter((item) => item.category === category || !item.category).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Field label="Stocked on" type="date" value={stockedOn} onChange={setStockedOn} required /><Field label="Quantity (pieces)" type="number" value={quantity} onChange={setQuantity} required /><Field label="Rate (paise/piece)" value={rate} onChange={setRate} required /><div className="grid grid-cols-2 gap-3"><Field label="Seed cost (paise)" value={seedCost} onChange={setSeedCost} required /><Field label="Transport (paise)" value={transport} onChange={setTransport} required /></div><ActionButton type="submit">Stock pond</ActionButton>{message && <p className="text-sm text-danger">{message}</p>}</form></Card></div>;
}
