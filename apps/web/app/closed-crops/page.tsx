'use client';

import { ApiGapScreen } from '../../src/components/api-gap-screen';

export default function ClosedCropsPage() {
  return <ApiGapScreen eyebrow="Archive" title="Closed-crop archive" subtitle="Read-only frozen P&L and closed crop history." endpoint="GET /crops?status=CLOSED" />;
}
