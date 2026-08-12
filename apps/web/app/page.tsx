'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet, getSession } from '../src/lib/api';
import type { components } from '../src/lib/api.generated';
import { Card, Disclosure, PageHeader, StatCard } from '../src/components/design-system';
import { useI18n } from '../src/lib/i18n';
import { attentionLabel, attentionStateLabel } from '../src/lib/attention';
import { formatPaise } from '../src/lib/money';

type Pond = components['schemas']['PondListItemDto'];

export default function DashboardPage() {
  const { t, language } = useI18n();
  const financial = getSession()?.financialAccess === true;
  const ponds = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  const pnl = useQuery({ queryKey: ['home-pnl'], queryFn: () => apiGet<{ revenuePaise: string; costPaise: string; netProfitPaise: string }>('/finance/reports/business-pnl'), enabled: financial });
  const attention = (ponds.data ?? []).filter((pond) => pond.attention.state !== 'GREEN');
  const stocked = (ponds.data ?? []).filter((pond) => pond.activeCrop && (pond.activeCrop.doc.value !== null || pond.activeCrop.status === 'STOCKED')).length;
  function attentionHref(pond: Pond) {
    const signals = pond.attention.signals ?? [];
    if (signals.some((signal) => signal.includes('WATER'))) return `/ponds/${pond.id}/water`;
    if (signals.some((signal) => signal.includes('GROWTH'))) return `/daily-entry?pondId=${pond.id}&cropId=${pond.activeCrop?.id ?? ''}&kind=growth`;
    if (signals.some((signal) => signal.includes('HEALTH') || signal.includes('MORTALITY'))) return `/daily-entry?pondId=${pond.id}&cropId=${pond.activeCrop?.id ?? ''}&kind=health`;
    return `/daily-entry?pondId=${pond.id}&cropId=${pond.activeCrop?.id ?? ''}`;
  }
  return <div className="rise">
    <PageHeader eyebrow={t.home} title={t.whatNeedsDoing} subtitle={t.recordToday} action={<span className="chip"><i className="ph-duotone ph-cloud-check" /> {t.saved}</span>} />
    <section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">{t.whatNeedsDoing}</h2><Link className="text-xs font-bold text-primary" href="/ponds">{t.ponds}</Link></div>{ponds.isLoading && <Card className="card-pad"><p className="muted">{t.loading}</p></Card>}{ponds.error && <Card className="card-pad"><p className="text-danger">{ponds.error.message}</p></Card>}{!ponds.isLoading && attention.length === 0 && <Card className="card-pad"><p className="font-bold">{t.noAttention}</p><p className="muted mt-1 text-sm">{t.noAttentionHint}</p></Card>}<div className="grid gap-3">{attention.map((pond) => <Link key={pond.id} href={attentionHref(pond)} className={`pond-tile attention-${pond.attention.state}`}><div className="flex items-center justify-between"><span className="font-extrabold">{pond.name}</span><span className="chip">{attentionStateLabel(pond.attention.state, language)}</span></div><p className="muted mt-2 text-sm">{attentionLabel(pond.attention.reason, pond.attention.signals, language)}</p><span className="mt-3 inline-flex text-xs font-bold text-primary">{t.addEntry} <i className="ph-duotone ph-arrow-right ml-1" /></span></Link>)}</div></section>
    {financial && <section className="mt-6"><Card className="card-pad"><div className="flex items-center justify-between gap-3"><h2 className="font-extrabold">{t.moneyAtGlance}</h2><Link className="text-xs font-bold text-primary" href="/money">{t.money}</Link></div>{pnl.data ? <p className="mt-2 text-lg font-extrabold">{t.revenue} {formatPaise(pnl.data.revenuePaise)} · {t.cost} {formatPaise(pnl.data.costPaise)} · {t.netProfit} {formatPaise(pnl.data.netProfitPaise)}</p> : <p className="muted mt-2">{t.loading}</p>}</Card></section>}
    <Disclosure label={t.moreDetails} summary={`${ponds.data?.length ?? 0} ${t.ponds} · ${stocked} ${t.activeCrop}`}><div className="grid gap-3"><Link href="/ponds" className="list-row"><span className="pond-tile-icon"><i className="ph-duotone ph-drop" /></span><span className="flex-1"><strong className="block">{t.ponds}</strong><small className="muted">{t.pondDetails}</small></span><i className="ph-duotone ph-caret-right text-lg text-primary" /></Link><Link href="/daily-entry" className="list-row"><span className="pond-tile-icon"><i className="ph-duotone ph-bowl-food" /></span><span className="flex-1"><strong className="block">{t.daily}</strong><small className="muted">{t.recordToday}</small></span><i className="ph-duotone ph-caret-right text-lg text-primary" /></Link></div></Disclosure>
  </div>;
}
