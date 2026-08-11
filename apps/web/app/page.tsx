'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../src/lib/api';
import type { components } from '../src/lib/api.generated';
import { Card, PageHeader, StatCard } from '../src/components/design-system';
import { useI18n } from '../src/lib/i18n';
import { attentionLabel, attentionStateLabel } from '../src/lib/attention';

type Pond = components['schemas']['PondListItemDto'];

export default function DashboardPage() {
  const { t, language } = useI18n();
  const ponds = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  const attention = (ponds.data ?? []).filter((pond) => pond.attention.state !== 'GREEN');
  const stocked = (ponds.data ?? []).filter((pond) => pond.activeCrop && (pond.activeCrop.doc.value !== null || pond.activeCrop.status === 'STOCKED')).length;
  return <div className="rise">
    <PageHeader eyebrow={t.home} title="Good morning" subtitle="Your farm at a glance" action={<span className="chip"><i className="ph-duotone ph-cloud-check" /> Synced</span>} />
    <div className="grid grid-cols-2 gap-3"><div className="stat-card accent"><p className="muted text-xs font-bold">{t.ponds}</p><p className="stat-value">{String(ponds.data?.length ?? 0)} <small className="text-sm font-bold">ponds</small></p></div><StatCard label={t.activeCrop} value={String(stocked)} unit="live" tone="success" /></div>
    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">Attention needed</h2><Link className="text-xs font-bold text-primary" href="/ponds">View all</Link></div>{ponds.isLoading && <Card className="card-pad"><p className="muted">{t.loading}</p></Card>}{ponds.error && <Card className="card-pad"><p className="text-danger">{ponds.error.message}</p></Card>}{!ponds.isLoading && attention.length === 0 && <Card className="card-pad"><p className="font-bold">All checks are up to date</p><p className="muted mt-1 text-sm">Your ponds are ready for today.</p></Card>}<div className="grid gap-3">{attention.slice(0, 3).map((pond) => <Link key={pond.id} href={`/ponds/${pond.id}`} className={`pond-tile attention-${pond.attention.state}`}><div className="flex items-center justify-between"><span className="font-extrabold">{pond.name}</span><span className="chip">{attentionStateLabel(pond.attention.state, language)}</span></div><p className="muted mt-2 text-sm">{attentionLabel(pond.attention.reason, pond.attention.signals, language)}</p></Link>)}</div></section>
    <section className="mt-6"><h2 className="mb-3 text-lg font-extrabold">Quick actions</h2><div className="card card-pad"><Link href="/daily-entry" className="list-row"><span className="pond-tile-icon"><i className="ph-duotone ph-bowl-food" /></span><span className="flex-1"><strong className="block">{t.feed}</strong><small className="muted">Log today&apos;s feed</small></span><i className="ph-duotone ph-caret-right text-lg text-primary" /></Link><Link href="/ponds" className="list-row"><span className="pond-tile-icon"><i className="ph-duotone ph-drop" /></span><span className="flex-1"><strong className="block">{t.ponds}</strong><small className="muted">Open pond dashboard</small></span><i className="ph-duotone ph-caret-right text-lg text-primary" /></Link></div></section>
  </div>;
}
