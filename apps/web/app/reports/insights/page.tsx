'use client';

import { ApiGapScreen } from '../../../src/components/api-gap-screen';

export default function InsightsPage() {
  return <ApiGapScreen eyebrow="Reports" title="Insights" subtitle="Farmer-facing observations from server-backed reports." endpoint="GET /finance/reports/insights" />;
}
