'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../../src/lib/api';
import { Card, PageHeader } from '../../../../src/components/design-system';
import type { components } from '../../../../src/lib/api.generated';

export default function ActivityPage() {
  const { id } = useParams<{ id: string }>();
  const pond = useQuery({ queryKey: ['pond', id], queryFn: () => apiGet<components['schemas']['PondListItemDto']>(`/masters/ponds/${id}`) });
  return <div className="rise"><PageHeader eyebrow="Crop activity" title="Recent activity" subtitle="Newest records for this pond and crop." /><Card className="card-pad"><p className="muted">NOT_DETERMINABLE</p><p className="mt-2 text-sm">The current API exposes mutation endpoints but no crop activity-list endpoint. Pond data loaded: {pond.data?.name ?? '—'}.</p></Card></div>;
}
