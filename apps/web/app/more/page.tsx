'use client';

import Link from 'next/link';
import { Disclosure, PageHeader } from '../../src/components/design-system';
import { useI18n } from '../../src/lib/i18n';

export default function MorePage() {
  const { t } = useI18n();
  const allTools: Array<[string, string, string]> = [
    ['/attendance', t.labour, t.recordDaysHint],
    ['/audit', t.auditTrail, t.auditTrailHint],
    ['/business', t.switchFarm, t.switchFarmHint],
    ['/business/profile', t.farmProfile, t.farmProfileHint],
    ['/closed-crops', t.closedCrops, t.moreDetails],
    ['/closure', t.closeCrop, t.readyToClose],
    ['/daily-entry', t.daily, t.recordToday],
    ['/daily-entry/bulk', t.bulkFeed, t.recordToday],
    ['/harvest', t.harvestClosure, t.recordToday],
    ['/harvest/events', t.harvestEvents, t.moreDetails],
    ['/harvest/market-rates', t.marketRates, t.moreDetails],
    ['/masters', t.referenceChoices, t.referenceChoicesHint],
    ['/money', t.money, t.moneyHint],
    ['/money/allocation', t.allocation, t.moreDetails],
    ['/money/assets', t.assets, t.moreDetails],
    ['/money/cash', t.reportCash, t.moreDetails],
    ['/money/cash-requirement', t.reportCash, t.moreDetails],
    ['/money/credit', t.creditHeadroom, t.moreDetails],
    ['/money/expense', t.recordSpending, t.moreDetails],
    ['/money/idle-cost', t.idleCost, t.moreDetails],
    ['/money/lease', t.lease, t.moreDetails],
    ['/money/ledger', t.partyLedger, t.moreDetails],
    ['/money/new-party', t.addParty, t.moreDetails],
    ['/money/parties', t.party, t.moreDetails],
    ['/money/payment', t.recordPayment, t.moreDetails],
    ['/money/payables', t.payables, t.moreDetails],
    ['/money/receivables', t.receivables, t.moreDetails],
    ['/money/scrap', t.scrap, t.moreDetails],
    ['/ponds', t.ponds, t.pondDetails],
    ['/ponds/new', t.addEntry, t.setUpPondHint],
    ['/reports', t.reports, t.moreReports],
    ['/reports/insights', t.insights, t.moreDetails],
    ['/settings/theme', t.themeSettings, t.themeSettingsHint],
    ['/sync', t.syncStatus, t.syncStatusHint],
  ];
  const groups = {
    record: [['/attendance', t.labour, t.recordDaysHint]],
    reports: [['/reports', t.reports, t.moreReports]],
    setup: [['/business/profile', t.farmProfile, t.farmProfileHint], ['/masters', t.referenceChoices, t.referenceChoicesHint], ['/business', t.switchFarm, t.switchFarmHint]],
    account: [['/login', t.signInAgain, t.signInAgainHint]],
  };
  const render = (items: string[][]) => <div className="grid gap-3 sm:grid-cols-2">{items.map(([href, title, subtitle]) => <Link href={href} className="card card-pad tap" key={href}><h2 className="font-extrabold">{title}</h2><p className="muted mt-2 text-sm">{subtitle}</p></Link>)}</div>;
  return <section className="rise"><PageHeader eyebrow={t.more} title={t.more} subtitle={t.simpleMoreHint} /><div className="mt-6 grid gap-5"><section><h2 className="section-title mb-3">{t.recordGroup}</h2>{render(groups.record)}</section><section><h2 className="section-title mb-3">{t.reports}</h2>{render(groups.reports)}</section><section><h2 className="section-title mb-3">{t.setup}</h2>{render(groups.setup)}</section><section><h2 className="section-title mb-3">{t.account}</h2>{render(groups.account)}</section><Disclosure label={t.allTools} summary={t.allToolsHint}>{render(allTools)}</Disclosure><Disclosure label={t.advanced}>{render([['/audit', t.auditTrail, t.auditTrailHint], ['/sync', t.syncStatus, t.syncStatusHint], ['/settings/theme', t.themeSettings, t.themeSettingsHint]])}</Disclosure></div></section>;
}
