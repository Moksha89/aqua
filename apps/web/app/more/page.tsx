'use client';

import Link from 'next/link';
export default function MorePage() {
  return <section><h1 className="text-3xl font-semibold">More</h1><div className="mt-6 grid gap-4 sm:grid-cols-2"><Link href="/settings/theme" className="rounded-xl border border-border bg-surface p-5"><h2 className="font-semibold">Theme settings</h2><p className="mt-2 text-textSecondary">Manage semantic business colours.</p></Link><Link href="/business" className="rounded-xl border border-border bg-surface p-5"><h2 className="font-semibold">Switch business</h2><p className="mt-2 text-textSecondary">Change the active business context.</p></Link></div></section>;
}
