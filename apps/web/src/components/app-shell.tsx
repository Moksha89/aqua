'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getSession, type Session } from '../lib/api';
import { useI18n } from '../lib/i18n';

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, setLanguage } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (!current && pathname !== '/login') router.replace('/login');
    if (current && pathname === '/login') router.replace('/');
  }, [pathname, router]);
  if (pathname === '/login') return <>{children}</>;
  if (!session) return <main className="flex min-h-screen items-center justify-center bg-background text-textSecondary">{t.loading}</main>;
  const tabs = [
    { href: '/', label: t.home },
    { href: '/ponds', label: t.ponds },
    { href: '/daily-entry', label: t.daily },
    ...(session.financialAccess === false || (session.role === 'AE_OPERATOR' && session.financialAccess !== true) ? [] : [{ href: '/money', label: t.money }]),
    { href: '/more', label: t.more },
  ];
  return <div className="min-h-screen bg-background pb-20 text-textPrimary">
    <header className="border-b border-border bg-surface"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><Link className="font-semibold text-primary" href="/">AE Farm</Link><div className="flex items-center gap-3"><button className="text-sm text-textSecondary" onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}>{language === 'en' ? 'తెలుగు' : 'English'}</button><button className="text-sm text-danger" onClick={() => { clearSession(); router.replace('/login'); }}>Sign out</button></div></div></header>
    <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    <button aria-label={t.quickAdd} className="fixed bottom-20 right-5 rounded-full bg-primary px-5 py-3 font-semibold text-onPrimary shadow-lg" onClick={() => router.push('/daily-entry')}>+ {t.quickAdd}</button>
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface"><div className="mx-auto flex max-w-6xl justify-around px-2 py-2">{tabs.map((tab) => <Link key={tab.href} className={`rounded-lg px-3 py-2 text-sm ${pathname === tab.href ? 'bg-primary text-onPrimary' : 'text-textSecondary'}`} href={tab.href}>{tab.label}</Link>)}</div></nav>
  </div>;
}
