'use client';

import Link from 'next/link';
import { Disclosure, PageHeader } from '../../src/components/design-system';
import { useI18n } from '../../src/lib/i18n';

export default function MorePage() {
  const { t } = useI18n();
  const groups = {
    record: [['/attendance', t.labour, t.recordDaysHint]],
    reports: [['/reports', t.reports, t.moreReports]],
    setup: [['/business/profile', t.farmProfile, t.farmProfileHint], ['/masters', t.referenceChoices, t.referenceChoicesHint], ['/business', t.switchFarm, t.switchFarmHint]],
    account: [['/login', t.signInAgain, t.signInAgainHint]],
  };
  const render = (items: string[][]) => <div className="grid gap-3 sm:grid-cols-2">{items.map(([href, title, subtitle]) => <Link href={href} className="card card-pad tap" key={href}><h2 className="font-extrabold">{title}</h2><p className="muted mt-2 text-sm">{subtitle}</p></Link>)}</div>;
  return <section className="rise"><PageHeader eyebrow={t.more} title={t.more} subtitle={t.simpleMoreHint} /><div className="mt-6 grid gap-5"><section><h2 className="section-title mb-3">{t.recordGroup}</h2>{render(groups.record)}</section><section><h2 className="section-title mb-3">{t.reports}</h2>{render(groups.reports)}</section><section><h2 className="section-title mb-3">{t.setup}</h2>{render(groups.setup)}</section><section><h2 className="section-title mb-3">{t.account}</h2>{render(groups.account)}</section><Disclosure label={t.advanced}>{render([['/audit', t.auditTrail, t.auditTrailHint], ['/sync', t.syncStatus, t.syncStatusHint], ['/settings/theme', t.themeSettings, t.themeSettingsHint]])}</Disclosure></div></section>;
}
