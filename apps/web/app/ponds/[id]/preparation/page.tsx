'use client';

import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../../../src/components/design-system';
import { useI18n } from '../../../../src/lib/i18n';

type Activity = { id: string; name: string; startDate: string; amountPaise: string; labourCostPaise: string; materialCostPaise: string; remarks?: string };

export default function PreparationPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();
  const activities = useQuery({ queryKey: ['preparations', id], queryFn: () => apiGet<Activity[]>(`/ponds/${id}/preparations`) });
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [labour, setLabour] = useState('0');
  const [materials, setMaterials] = useState('0');
  const [amount, setAmount] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/ponds/${id}/preparations`, { method: 'POST', body: JSON.stringify({ name, startDate, labourCostPaise: labour, materialCostPaise: materials, amountPaise: amount, remarks }) });
      setMessage(t.saved);
      setName(''); setAmount('0'); setLabour('0'); setMaterials('0'); setRemarks('');
      await client.invalidateQueries({ queryKey: ['preparations', id] });
    } catch (error) { setMessage(error instanceof Error ? error.message : t.noData); }
  }
  return <div className="rise"><PageHeader eyebrow="Pond preparation" title="Prepare this pond" subtitle="Track each activity and its pooled cost before stocking." /><Card className="card-pad"><div className="mb-5 flex items-center justify-between"><span className="font-extrabold">Preparation progress</span><span className="chip">{activities.data?.length ?? 0} activities</span></div><form onSubmit={submit} className="grid gap-4"><Field label="Activity" value={name} onChange={setName} required /><Field label="Start date" type="date" value={startDate} onChange={setStartDate} required /><div className="grid grid-cols-2 gap-3"><Field label="Labour (paise)" value={labour} onChange={setLabour} required /><Field label="Materials (paise)" value={materials} onChange={setMaterials} required /></div><Field label="Total amount (paise)" value={amount} onChange={setAmount} required /><Field label="Remarks" value={remarks} onChange={setRemarks} /><ActionButton type="submit">Save activity</ActionButton>{message && <p className="text-sm text-primary">{message}</p>}</form></Card><section className="mt-5 grid gap-3">{(activities.data ?? []).map((item) => <Card className="card-pad" key={item.id}><div className="flex items-center justify-between"><h2 className="font-extrabold">{item.name}</h2><span className="chip">₹{item.amountPaise}</span></div><p className="muted mt-2 text-xs">{new Date(item.startDate).toLocaleDateString()} {item.remarks ? `· ${item.remarks}` : ''}</p></Card>)}</section></div>;
}
