import { Card, PageHeader } from '../../src/components/design-system';

export default function AuditPage() {
  return <div className="rise"><PageHeader eyebrow="Integrity" title="Audit trail" subtitle="Every financial and operational mutation is recorded server-side." /><Card className="card-pad"><p className="muted">NOT_DETERMINABLE</p><p className="mt-2 text-sm">An authenticated audit-list endpoint is not exposed by the current API, so entries cannot be displayed without inventing data.</p></Card></div>;
}
