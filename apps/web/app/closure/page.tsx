'use client';

import { ApiGapScreen } from '../../src/components/api-gap-screen';

export default function ClosurePage() {
  return <ApiGapScreen eyebrow="Closure" title="Closure checklist" subtitle="Complete harvest, stock, occupancy, and allocation checks before freezing P&L." endpoint="GET /crops/:cropId/closure-checklist" />;
}
