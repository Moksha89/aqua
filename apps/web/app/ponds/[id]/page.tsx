'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../src/lib/api';
import type { components } from '../../../src/lib/api.generated';
import { ActionButton, Card, FigureCard, PageHeader } from '../../../src/components/design-system';
import { useI18n } from '../../../src/lib/i18n';

type Pond = components['schemas']['PondListItemDto'];

export default function PondDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const pond = useQuery({ queryKey: ['pond', id], queryFn: () => apiGet<Pond>(`/masters/ponds/${id}`) });
  if (pond.isLoading) return <Card className="card-pad"><p className="muted">{t.loading}</p></Card>;
  if (pond.error || !pond.data) return <Card className="card-pad"><p className="text-danger">{pond.error?.message ?? t.noData}</p></Card>;
  const crop = pond.data.activeCrop;
  return <div className="rise"><Link href="/ponds" className="mb-4 inline-flex text-sm font-bold text-primary"><i className="ph-duotone ph-arrow-left mr-2" />{t.backPonds}</Link><PageHeader eyebrow={pond.data.code} title={pond.data.name} subtitle={`${pond.data.extentAcres} acres · ${pond.data.status}`} action={<span className="chip">{pond.data.attention.state}</span>} /><Card className="crop-hero card-pad"><div><p className="muted text-xs font-extrabold uppercase tracking-[.16em]">Crop dashboard</p><h2 className="mt-2 text-2xl font-extrabold">{crop?.code ?? 'Ready for preparation'}</h2><p className="muted mt-1">{crop ? `Day ${crop.doc.value ?? '—'} · ${crop.status}` : 'Start preparation, water validation and stocking.'}</p></div><div className="stat-arc" aria-hidden="true"><svg viewBox="0 0 120 70"><path d="M10 60a50 50 0 0 1 100 0" /><path className="stat-arc-value" d="M10 60a50 50 0 0 1 100 0" /></svg><span>{crop?.doc.value ?? '—'}<small>DOC</small></span></div></Card><Card className="card-pad"><div className="flex items-start gap-3"><i className="ph-duotone ph-bell-ringing text-2xl text-primary" /><div><p className="font-extrabold">Pond attention</p><p className="muted mt-1 text-sm">{pond.data.attention.reason}</p></div></div></Card><div className="mt-5 grid grid-cols-3 gap-2"><ActionButton href={`/ponds/${id}/preparation`} secondary>Preparation</ActionButton><ActionButton href={`/ponds/${id}/water`} secondary>Water check</ActionButton><ActionButton href={`/ponds/${id}/stock`} secondary>Stock</ActionButton></div><section className="mt-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">{t.activeCrop}</h2>{crop && <span className="chip">{crop.code}</span>}</div>{!crop ? <Card className="card-pad"><p className="muted">{t.noActiveCrop}</p><div className="mt-4"><ActionButton href={`/ponds/${id}/preparation`} secondary>Start preparation</ActionButton></div></Card> : <><div className="grid grid-cols-2 gap-3"><FigureCard label={t.doc} figure={crop.doc} /><FigureCard label={t.abw} figure={crop.abw} /><FigureCard label={t.biomass} figure={crop.biomass} /><FigureCard label={t.fcr} figure={crop.fcr} /><FigureCard label={t.density} figure={crop.density} /></div><div className="mt-4 flex gap-2"><ActionButton href={`/daily-entry?pondId=${pond.data.id}&cropId=${crop.id}`}>{t.daily}</ActionButton><ActionButton href={`/daily-entry?pondId=${pond.data.id}&cropId=${crop.id}`} secondary>Activity log</ActionButton></div></>}</section></div>;
}
