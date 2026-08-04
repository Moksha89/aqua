'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../src/lib/api';
import type { components } from '../../src/lib/api.generated';
import { useI18n } from '../../src/lib/i18n';

type Pond = components['schemas']['PondListItemDto'];
function attentionClass(state: components['schemas']['PondAttentionDto']['state']): string {
  return state === 'RED' ? 'border-pondAttentionRed bg-pondAttentionRed/10' : state === 'AMBER' ? 'border-pondAttentionAmber bg-pondAttentionAmber/10' : 'border-pondAttentionGreen bg-pondAttentionGreen/10';
}
export default function PondsPage() {
  const { t } = useI18n();
  const query = useQuery({ queryKey: ['ponds'], queryFn: () => apiGet<Pond[]>('/masters/ponds') });
  return <section><div className="flex items-center justify-between"><div><h1 className="text-3xl font-semibold">{t.ponds}</h1><p className="mt-2 text-textSecondary">{t.serverAttention}</p></div><Link href="/daily-entry" className="rounded-lg bg-primary px-4 py-2 text-onPrimary">{t.addEntry}</Link></div>{query.isLoading && <p className="mt-6 text-textSecondary">{t.loading}</p>}{query.error && <p className="mt-6 text-danger">{query.error.message}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(query.data ?? []).map((pond) => <Link key={pond.id} href={`/ponds/${pond.id}`} className={`rounded-xl border-2 p-5 ${attentionClass(pond.attention.state)}`}><div className="flex items-center justify-between"><h2 className="font-semibold">{pond.name}</h2><span className="text-xs text-textSecondary">{pond.attention.state}</span></div><p className="mt-2 text-sm text-textSecondary">{pond.code}</p><p className="mt-3 text-xs text-textSecondary">{pond.attention.reason}</p></Link>)}</div>{!query.isLoading && query.data?.length === 0 && <p className="mt-8 text-textSecondary">{t.noPonds}</p>}</section>;
}
