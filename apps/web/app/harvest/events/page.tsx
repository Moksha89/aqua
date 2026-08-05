'use client';

import { ApiGapScreen } from '../../../src/components/api-gap-screen';

export default function HarvestEventsPage() {
  return <ApiGapScreen eyebrow="Harvest" title="Harvest events" subtitle="Review count-wise shrimp and grade-wise fish harvests." endpoint="GET /crops/:cropId/harvests" />;
}
