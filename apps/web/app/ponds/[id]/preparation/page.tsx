'use client';

import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../../../src/components/design-system';
import { useI18n } from '../../../../src/lib/i18n';
import { formatPaise, rupeesToPaise } from '../../../../src/lib/money';

type Activity = { id: string; name: string; startDate: string; amountPaise: string; labourCostPaise: string; materialCostPaise: string; remarks?: string };

export default function PreparationPage() {
  const { t, language } = useI18n();
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
      await apiRequest(`/ponds/${id}/preparations`, { method: 'POST', body: JSON.stringify({ name, startDate, labourCostPaise: rupeesToPaise(labour), materialCostPaise: rupeesToPaise(materials), amountPaise: rupeesToPaise(amount), remarks }) });
      setMessage(t.saved);
      setName(''); setAmount('0'); setLabour('0'); setMaterials('0'); setRemarks('');
      await client.invalidateQueries({ queryKey: ['preparations', id] });
    } catch (error) { setMessage(error instanceof Error ? error.message : t.noData); }
  }
  const te = language === 'te';
  return <div className="rise"><PageHeader eyebrow={te ? 'చెరువు సిద్ధం' : 'Pond preparation'} title={te ? 'ఈ చెరువును సిద్ధం చేయండి' : 'Prepare this pond'} subtitle={te ? 'స్టాక్ చేయడానికి ముందు కార్యకలాపాలు మరియు కలిపిన ఖర్చును నమోదు చేయండి.' : 'Track each activity and its pooled cost before stocking.'} /><Card className="card-pad"><div className="mb-5 flex items-center justify-between"><span className="font-extrabold">{te ? 'సిద్ధం పురోగతి' : 'Preparation progress'}</span><span className="chip">{activities.data?.length ?? 0} {te ? 'కార్యకలాపాలు' : 'activities'}</span></div><form onSubmit={submit} className="grid gap-4"><Field label={te ? 'కార్యకలాపం' : 'Activity'} value={name} onChange={setName} required /><Field label={te ? 'ప్రారంభ తేదీ' : 'Start date'} type="date" value={startDate} onChange={setStartDate} required /><div className="grid grid-cols-2 gap-3"><Field label={te ? 'కూలీ (₹)' : 'Labour (₹)'} value={labour} onChange={setLabour} required /><Field label={te ? 'సామగ్రి (₹)' : 'Materials (₹)'} value={materials} onChange={setMaterials} required /></div><Field label={te ? 'మొత్తం (₹)' : 'Total amount (₹)'} value={amount} onChange={setAmount} required /><Field label={te ? 'గమనికలు' : 'Remarks'} value={remarks} onChange={setRemarks} /><ActionButton type="submit">{te ? 'కార్యకలాపం సేవ్ చేయండి' : 'Save activity'}</ActionButton>{message && <p className="text-sm text-primary">{message}</p>}</form></Card><section className="mt-5 grid gap-3">{(activities.data ?? []).map((item) => <Card className="card-pad" key={item.id}><div className="flex items-center justify-between"><h2 className="font-extrabold">{item.name}</h2><span className="chip">{formatPaise(item.amountPaise)}</span></div><p className="muted mt-2 text-xs">{new Date(item.startDate).toLocaleDateString()} {item.remarks ? `· ${item.remarks}` : ''}</p></Card>)}</section></div>;
}
