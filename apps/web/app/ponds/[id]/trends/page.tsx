'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../../src/lib/api';
import { Card, PageHeader } from '../../../../src/components/design-system';
import type { components } from '../../../../src/lib/api.generated';

export default function TrendsPage() {
  const { id } = useParams<{ id: string }>();
  const pond = useQuery({ queryKey: ['pond', id], queryFn: () => apiGet<components['schemas']['PondListItemDto']>(`/masters/ponds/${id}`) });
  return <div className="rise"><PageHeader eyebrow="Crop trends" title="Trends" subtitle="FCR, growth and water bands over time." /><Card className="card-pad"><p className="muted">NOT_DETERMINABLE</p><p className="mt-2 text-sm">The current API exposes latest figure envelopes but not historical trend series. No client-side series is invented for {pond.data?.name ?? 'this pond'}.</p></Card></div>;
}
