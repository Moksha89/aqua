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
  if (!session) return <main className="app-frame flex min-h-screen items-center justify-center"><span className="muted">{t.loading}</span></main>;
  const tabs = [
    { href: '/', label: t.home, icon: 'ph-house' },
    { href: '/ponds', label: t.ponds, icon: 'ph-drop' },
    { href: '/daily-entry', label: t.daily, icon: 'ph-plus' },
    ...(session.financialAccess === true ? [{ href: '/money', label: t.money, icon: 'ph-wallet' }] : []),
    { href: '/more', label: t.more, icon: 'ph-list' },
  ];
  return <div className="app-frame text-textPrimary">
    <header className="app-topbar">
      <Link className="text-lg font-extrabold tracking-tight text-primary" href="/">AE Farm</Link>
      <div className="flex items-center gap-3">
        <button aria-label="Change language" className="muted text-xs font-bold" onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}>{language === 'en' ? 'తెలుగు' : 'English'}</button>
        <button aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-full bg-primary font-bold text-onPrimary" onClick={() => { clearSession(); router.replace('/login'); }}>AF</button>
      </div>
    </header>
    <main className="app-content">{children}</main>
    <nav className="bottom-nav"><div className="bottom-nav-inner">
      {tabs.map((tab, index) => index === 2
        ? <div className="bottom-tab fab-space" key={tab.href}><button aria-label={t.quickAdd} className="fab tap" onClick={() => router.push('/daily-entry')}><i className="ph-duotone ph-plus" /></button><span>{t.quickAdd}</span></div>
        : <Link key={tab.href} className={`bottom-tab ${pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href)) ? 'active' : ''}`} href={tab.href}><i className={`ph-duotone ${tab.icon} text-xl`} /><span>{tab.label}</span></Link>)}
    </div></nav>
  </div>;
}
