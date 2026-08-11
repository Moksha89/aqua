'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../src/lib/api';
import { Card, PageHeader } from '../../src/components/design-system';

export default function MastersPage() {
  const species = useQuery({ queryKey: ['masters-species'], queryFn: () => apiGet<Array<{ id: string; name: string; category: string }>>('/masters/species') });
  const feed = useQuery({ queryKey: ['masters-feed'], queryFn: () => apiGet<Array<{ id: string; brand: string; gradeCode: string; bagWeightKg: string }>>('/masters/feed-items') });
  const medicine = useQuery({ queryKey: ['masters-medicine'], queryFn: () => apiGet<Array<{ id: string; name: string; category: string; unit: string }>>('/masters/medicine-items') });
  const labour = useQuery({ queryKey: ['masters-labour'], queryFn: () => apiGet<Array<{ id: string; name: string; engagementType: string }>>('/masters/labour') });
  return <div className="rise"><PageHeader eyebrow="Reference data" title="Masters" subtitle="Server-backed choices used by daily entries and crop workflows." /><div className="grid gap-4">{[['Species', species.data?.map((item) => `${item.name} · ${item.category}`)], ['Feed', feed.data?.map((item) => `${item.brand} · ${item.gradeCode} · ${item.bagWeightKg} kg`)], ['Medicine', medicine.data?.map((item) => `${item.name} · ${item.category}`)], ['Labour', labour.data?.map((item) => `${item.name} · ${item.engagementType}`)]].map(([title, values]) => <Card className="card-pad" key={String(title)}><h2 className="font-extrabold">{title}</h2>{Array.isArray(values) && values.length > 0 ? <ul className="mt-3 grid gap-2">{values.map((value) => <li className="rounded-xl bg-background p-3 text-sm" key={String(value)}>{value}</li>)}</ul> : <p className="muted mt-2 text-sm">No records returned by the API.</p>}</Card>)}</div></div>;
}
