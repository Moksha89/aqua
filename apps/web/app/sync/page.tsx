'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../src/lib/api';
import { Card, PageHeader } from '../../src/components/design-system';

type Pull = { cursor?: string; changes?: Array<{ entity: string; entityId: string; operation: string; changedAt: string }> };

export default function SyncPage() {
  const pull = useQuery({ queryKey: ['sync-pull'], queryFn: () => apiGet<Pull>('/sync/pull?limit=50') });
  return <div className="rise"><PageHeader eyebrow="Device sync" title="Sync outbox" subtitle="The server cursor and changes are visible here; offline pending records are retained on the mobile device." /><Card className="card-pad"><div className="flex items-center justify-between"><h2 className="font-extrabold">Server cursor</h2><span className="chip">{pull.data?.cursor ?? 'Not started'}</span></div>{pull.data?.changes?.length ? <ul className="mt-4 grid gap-2">{pull.data.changes.map((change) => <li className="rounded-xl bg-background p-3 text-sm" key={`${change.entity}-${change.entityId}`}><strong>{change.entity}</strong> · {change.operation}<span className="muted ml-2">{new Date(change.changedAt).toLocaleString()}</span></li>)}</ul> : <p className="muted mt-4 text-sm">{pull.isLoading ? 'Pulling changes…' : 'No changes returned.'}</p>}</Card></div>;
}
