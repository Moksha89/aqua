import { Card, PageHeader } from '../../../src/components/design-system';

export default function BusinessProfilePage() {
  return <div className="rise"><PageHeader eyebrow="Business" title="Business profile" subtitle="Identity and operating details are owned by the business service." /><Card className="card-pad"><p className="muted">NOT_DETERMINABLE</p><p className="mt-2 text-sm">The current API exposes business switching but not a business-profile read or update endpoint. No demo values are shown.</p></Card></div>;
}
