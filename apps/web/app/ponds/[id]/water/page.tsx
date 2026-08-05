'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../../src/lib/api';
import { ActionButton, Card, PageHeader } from '../../../../src/components/design-system';

type Species = { id: string; name: string; category: string };
type Readiness = { ready: boolean; outOfRange: Array<{ parameter: string; value: number; min: number; max: number }> };

export default function WaterReadinessPage() {
  const { id } = useParams<{ id: string }>();
  const species = useQuery({ queryKey: ['species'], queryFn: () => apiGet<Species[]>('/masters/species') });
  const speciesId = species.data?.[0]?.id;
  const readiness = useQuery({ queryKey: ['water-readiness', id, speciesId], queryFn: () => apiGet<Readiness>(`/ponds/${id}/water-readiness?speciesId=${speciesId}`), enabled: Boolean(speciesId) });
  return <div className="rise"><PageHeader eyebrow="Before stocking" title="Water validation" subtitle="A server advisory against the configured species bands." />{readiness.isLoading && <Card className="card-pad"><p className="muted">Checking the latest reading…</p></Card>}{readiness.error && <Card className="card-pad"><p className="text-danger">{readiness.error.message}</p></Card>}{readiness.data && <Card className="card-pad"><div className="flex items-center gap-3"><i className={`ph-duotone ${readiness.data.ready ? 'ph-check-circle text-success' : 'ph-warning text-warning'} text-4xl`} /><div><h2 className="text-xl font-extrabold">{readiness.data.ready ? 'Ready to stock' : 'Review water first'}</h2><p className="muted mt-1 text-sm">{readiness.data.ready ? 'No latest reading is outside the configured band.' : 'The following values need attention.'}</p></div></div>{readiness.data.outOfRange.length > 0 && <div className="mt-5 grid gap-2">{readiness.data.outOfRange.map((item) => <div className="flex justify-between rounded-xl bg-warning/10 p-3 text-sm" key={item.parameter}><span className="font-bold">{item.parameter}</span><span>{item.value} · safe {item.min}–{item.max}</span></div>)}</div>}<div className="mt-5"><ActionButton href={`/ponds/${id}/stock`}>Continue to stocking</ActionButton></div></Card>}</div>;
}
