'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../src/lib/api';
import type { components } from '../src/lib/api.generated';
import { Card, PageHeader, StatCard } from '../src/components/design-system';
import { useI18n } from '../src/lib/i18n';

type Pond = components['schemas']['PondListItemDto'];

export default function DashboardPage() {
  const { t } = useI18n();
  const ponds = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  const attention = (ponds.data ?? []).filter((pond) => pond.attention.state !== 'GREEN');
  const stocked = (ponds.data ?? []).filter((pond) => pond.activeCrop && (pond.activeCrop.doc.value !== null || pond.activeCrop.status === 'STOCKED')).length;
  return <div className="rise">
    <PageHeader eyebrow={t.home} title="Good morning" subtitle="Your farm at a glance" action={<span className="chip"><i className="ph-duotone ph-cloud-check" /> Synced</span>} />
    <div className="grid grid-cols-2 gap-3"><StatCard label={t.ponds} value={String(ponds.data?.length ?? 0)} unit="ponds" /><StatCard label={t.activeCrop} value={String(stocked)} unit="live" tone="success" /></div>
    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">Attention needed</h2><Link className="text-xs font-bold text-primary" href="/ponds">View all</Link></div>{ponds.isLoading && <Card className="card-pad"><p className="muted">{t.loading}</p></Card>}{ponds.error && <Card className="card-pad"><p className="text-danger">{ponds.error.message}</p></Card>}{!ponds.isLoading && attention.length === 0 && <Card className="card-pad"><p className="font-bold">All checks are up to date</p><p className="muted mt-1 text-sm">Your ponds are ready for today.</p></Card>}<div className="grid gap-3">{attention.slice(0, 3).map((pond) => <Link key={pond.id} href={`/ponds/${pond.id}`} className={`pond-tile attention-${pond.attention.state}`}><div className="flex items-center justify-between"><span className="font-extrabold">{pond.name}</span><span className="chip">{pond.attention.state}</span></div><p className="muted mt-2 text-sm">{pond.attention.reason}</p></Link>)}</div></section>
    <section className="mt-6"><h2 className="mb-3 text-lg font-extrabold">Quick actions</h2><div className="grid grid-cols-2 gap-3"><Link href="/daily-entry" className="card card-pad tap"><i className="ph-duotone ph-bowl-food text-2xl text-primary" /><p className="mt-3 font-extrabold">{t.feed}</p><p className="muted mt-1 text-xs">Log today&apos;s feed</p></Link><Link href="/ponds" className="card card-pad tap"><i className="ph-duotone ph-drop text-2xl text-primary" /><p className="mt-3 font-extrabold">{t.ponds}</p><p className="muted mt-1 text-xs">Open pond dashboard</p></Link></div></section>
  </div>;
}
