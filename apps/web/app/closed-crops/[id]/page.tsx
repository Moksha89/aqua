'use client';

import { ApiGapScreen } from '../../../src/components/api-gap-screen';

export default function ClosedCropDetailPage() {
  return <ApiGapScreen eyebrow="Archive" title="Closed-crop detail" subtitle="Read-only crop history and frozen P&L." endpoint="GET /crops/:cropId/frozen-pnl" />;
}
