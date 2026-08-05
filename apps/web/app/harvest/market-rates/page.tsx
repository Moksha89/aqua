'use client';

import { ApiGapScreen } from '../../../src/components/api-gap-screen';

export default function MarketRatesPage() {
  return <ApiGapScreen eyebrow="Harvest" title="Market rates" subtitle="Review dated species and count or grade rate cards." endpoint="GET /masters/market-rates" />;
}
