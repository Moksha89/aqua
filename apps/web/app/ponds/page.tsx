'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../src/lib/api';
import type { components } from '../../src/lib/api.generated';
import { ActionButton, Card, EmptyState, PageHeader } from '../../src/components/design-system';
import { useI18n } from '../../src/lib/i18n';
import { attentionLabel, attentionStateLabel, statusLabel } from '../../src/lib/attention';

type Pond = components['schemas']['PondListItemDto'];

export default function PondsPage() {
  const { t, language } = useI18n();
  const query = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  return <div className="rise"><PageHeader eyebrow={t.ponds} title="Your ponds" subtitle="Live status from the server" action={<ActionButton href="/ponds/new"><i className="ph-duotone ph-plus mr-2" />{t.addEntry}</ActionButton>} />{query.isLoading && <Card className="card-pad"><p className="muted">{t.loading}</p></Card>}{query.error && <Card className="card-pad"><p className="text-danger">{query.error.message}</p></Card>}{!query.isLoading && !query.data?.length && <EmptyState title={t.noPonds} body="Create your first pond to begin tracking work." action={<ActionButton href="/ponds/new">{t.addEntry}</ActionButton>} />}{Boolean(query.data?.length) && <div className="mt-5 grid gap-3">{(query.data ?? []).map((pond) => <Link key={pond.id} href={`/ponds/${pond.id}`} className={`pond-tile attention-${pond.attention.state}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="pond-tile-icon"><i className="ph-duotone ph-drop" /></span><div><p className="eyebrow">{pond.code}</p><h2 className="mt-1 text-lg font-extrabold">{pond.name}</h2></div></div><span className="chip">{attentionStateLabel(pond.attention.state, language)}</span></div><div className="mt-4 flex items-center justify-between"><p className="muted text-sm">{pond.activeCrop ? `${t.activeCrop} ${pond.activeCrop.code}` : t.noActiveCrop}</p><i className="ph-duotone ph-arrow-right text-xl text-primary" /></div><p className="muted mt-3 text-xs">{attentionLabel(pond.attention.reason, pond.attention.signals, language)}</p></Link>)}</div>}</div>;
}
