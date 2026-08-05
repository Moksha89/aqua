'use client';

import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../src/lib/api';
import type { components } from '../../../src/lib/api.generated';
import { ActionButton, Card, Field, PageHeader } from '../../../src/components/design-system';

type Pond = components['schemas']['PondListItemDto'];
type Feed = { id: string; brand: string; gradeCode: string };

export default function BulkFeedPage() {
  const ponds = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  const feed = useQuery({ queryKey: ['feed-items'], queryFn: () => apiGet<Feed[]>('/masters/feed-items') });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('AM');
  const [feedItemId, setFeedItemId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const rows = (ponds.data ?? []).filter((pond) => pond.activeCrop && quantities[pond.id]).map((pond) => ({ logDate: date, mealSlot: slot, feedItemId, quantityKg: quantities[pond.id]!, remarks: 'Bulk feed entry' }));
      await Promise.all((ponds.data ?? []).filter((pond) => pond.activeCrop && quantities[pond.id]).map((pond) => apiRequest(`/crops/${pond.activeCrop!.id}/feed-logs/bulk`, { method: 'POST', body: JSON.stringify({ rows: rows.filter((row) => row.quantityKg === quantities[pond.id]) }) })));
      setMessage(`${rows.length} pond entries saved`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save bulk feed'); }
  }
  return <div className="rise"><PageHeader eyebrow="Daily entry" title="Bulk feed" subtitle="One pass across all stocked ponds, with each value still attributed to its crop." /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><div className="grid grid-cols-2 gap-3"><Field label="Date" type="date" value={date} onChange={setDate} required /><label className="field-label">Meal slot<select className="field-input" value={slot} onChange={(event) => setSlot(event.target.value)}><option>AM</option><option>PM</option></select></label></div><label className="field-label">Feed item<select className="field-input" required value={feedItemId} onChange={(event) => setFeedItemId(event.target.value)}><option value="">Select feed</option>{(feed.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.brand} · {item.gradeCode}</option>)}</select></label>{(ponds.data ?? []).filter((pond) => pond.activeCrop).map((pond) => <Field key={pond.id} label={`${pond.name} · kg`} type="number" value={quantities[pond.id] ?? ''} onChange={(value) => setQuantities((current) => ({ ...current, [pond.id]: value }))} />)}<ActionButton type="submit">Save all ponds</ActionButton>{message && <p className="text-sm text-primary">{message}</p>}</form></Card></div>;
}
