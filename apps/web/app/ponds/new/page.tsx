'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiRequest } from '../../../src/lib/api';
import { ActionButton, Card, Field, PageHeader } from '../../../src/components/design-system';
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
  return <div className="rise"><PageHeader eyebrow={t.ponds} title={t.addEntry} subtitle="Set up the pond master before recording daily work." /><Card className="card-pad"><form onSubmit={submit} className="grid gap-4"><label className="field-label">Farm<select className="field-input" required value={farmId} onChange={(event) => setFarmId(event.target.value)}><option value="">Select farm</option>{(farms.data ?? []).map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label><Field label="Pond name" value={name} onChange={setName} required /><Field label="Pond code" value={code} onChange={setCode} required /><Field label="Extent (acres)" type="number" value={extentAcres} onChange={setExtentAcres} required /><label className="field-label">Ownership<select className="field-input" value={ownershipType} onChange={(event) => setOwnershipType(event.target.value)}><option value="OWN">Own</option><option value="LEASED">Leased</option></select></label><ActionButton type="submit">{t.addEntry}</ActionButton>{message && <p className="text-sm text-danger">{message}</p>}</form></Card></div>;
}
