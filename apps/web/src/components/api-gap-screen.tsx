'use client';

import { Card, PageHeader } from './design-system';
import { useI18n } from '../lib/i18n';

export function ApiGapScreen({ eyebrow, title, subtitle, endpoint }: { eyebrow: string; title: string; subtitle: string; endpoint: string }) {
  const { language } = useI18n();
  return <section className="rise"><PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} /><Card className="card-pad"><span className="chip">NOT DETERMINABLE</span><p className="mt-4 font-bold">{language === 'te' ? 'ఈ స్క్రీన్‌కు సర్వర్ డేటా ఇంకా అందుబాటులో లేదు.' : 'No server data is available for this screen yet.'}</p><p className="muted mt-2 text-sm">{language === 'te' ? 'అవసరమైన ఎండ్‌పాయింట్: ' : 'Endpoint needed: '}<code>{endpoint}</code></p></Card></section>;
}
