import { Card, PageHeader } from '../../src/components/design-system';

export default function AuditPage() {
  return <div className="rise"><PageHeader eyebrow="Integrity" title="Audit trail" subtitle="Every financial and operational mutation is recorded server-side." /><Card className="card-pad"><p className="muted">Audit history is not available yet.</p><p className="mt-2 text-sm">Your records remain protected; the history view will appear when the audit list is available.</p></Card></div>;
}
