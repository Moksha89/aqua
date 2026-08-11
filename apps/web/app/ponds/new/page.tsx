'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../src/lib/api';
import { ActionButton, Card, ChoiceToggle, Field, PageHeader, SelectField } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';

type Farm = { id: string; name: string };

export default function NewPondPage() {
  const { t } = useI18n();
  const router = useRouter();
  const farms = useQuery({ queryKey: ['farms'], queryFn: () => apiGet<Farm[]>('/masters/farms') });
  const [farmId, setFarmId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [extentAcres, setExtentAcres] = useState('');
  const [ownershipType, setOwnershipType] = useState('OWN');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest('/masters/ponds', { method: 'POST', body: JSON.stringify({ farmId, name, code, extentAcres: Number(extentAcres), ownershipType }) });
      router.replace('/ponds');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create pond'); }
  }
  return <div className="rise"><PageHeader eyebrow={t.ponds} title={t.addEntry} subtitle={t.setUpPondHint} /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><SelectField label={t.farm} required value={farmId} onChange={setFarmId} options={(farms.data ?? []).map((farm) => ({ value: farm.id, label: farm.name }))} /><Field label={t.pondName} value={name} onChange={setName} required /><Field label={t.pondCode} value={code} onChange={setCode} required /><Field label={t.extentAcres} type="number" value={extentAcres} onChange={setExtentAcres} required /><ChoiceToggle label={t.ownership} value={ownershipType} onChange={setOwnershipType} options={[{ value: 'OWN', label: t.own }, { value: 'LEASED', label: t.leased }]} /><ActionButton type="submit">{t.addEntry}</ActionButton>{message && <p className="text-sm text-danger">{message}</p>}</form></Card></div>;
}
