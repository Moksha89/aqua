'use client';

import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../src/components/design-system';

type Labour = { id: string; name: string; defaultRatePaise: string };

export default function AttendancePage() {
  const labour = useQuery({ queryKey: ['labour'], queryFn: () => apiGet<Labour[]>('/masters/labour') });
  const [labourId, setLabourId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState('1');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await apiRequest('/crops/attendance', { method: 'POST', body: JSON.stringify({ labourId, workDate: date, days, amountPaise: amount }) }); setMessage('Attendance saved'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save attendance'); }
  }
  return <div className="rise"><PageHeader eyebrow="Labour" title="Attendance" subtitle="Record days and the server-posted cost without doing payroll math in the client." /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><label className="field-label">Labour<select className="field-input" required value={labourId} onChange={(event) => { const value = event.target.value; setLabourId(value); setAmount(labour.data?.find((item) => item.id === value)?.defaultRatePaise ?? ''); }}><option value="">Select worker</option>{(labour.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Field label="Work date" type="date" value={date} onChange={setDate} required /><Field label="Days" type="number" value={days} onChange={setDays} required /><Field label="Amount (paise)" value={amount} onChange={setAmount} required /><ActionButton type="submit">Save attendance</ActionButton>{message && <p className="text-sm text-primary">{message}</p>}</form></Card></div>;
}
