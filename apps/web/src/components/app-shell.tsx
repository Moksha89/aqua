'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getSession, type Session } from '../lib/api';
import { FarmMark } from './design-system';
import { useI18n } from '../lib/i18n';
import { QuickAddSheet } from './quick-add-sheet';

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, setLanguage } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (!current && pathname !== '/login') router.replace('/login');
    if (current && !current.businessId && pathname !== '/business' && pathname !== '/login') router.replace('/business');
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
      <Link className="app-brand" href="/"><FarmMark /><span><strong>{session.businessName ?? 'AE Farm'}</strong>{session.mobile && <small>{session.mobile}</small>}</span></Link>
      <div className="flex items-center gap-3">
        <button aria-label="Notifications" className="header-icon"><i className="ph-duotone ph-bell" /></button>
        <button aria-label="Change language" className="muted text-xs font-bold" onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}>{language === 'en' ? 'తెలుగు' : 'English'}</button>
        <button aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-full bg-primary font-bold text-onPrimary" onClick={() => { clearSession(); router.replace('/login'); }}>AF</button>
      </div>
    </header>
    <main className="app-content">{children}</main>
    <nav className="bottom-nav"><div className="bottom-nav-inner">
      {tabs.map((tab, index) => index === 2
        ? <div className="bottom-tab fab-space" key={tab.href}><button aria-label={t.quickAdd} className="fab tap" onClick={() => setQuickAddOpen(true)}><i className="ph-duotone ph-plus" /></button><span>{t.quickAdd}</span></div>
        : <Link key={tab.href} className={`bottom-tab ${pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href)) ? 'active' : ''}`} href={tab.href}><i className={`ph-duotone ${tab.icon} text-xl`} /><span>{tab.label}</span></Link>)}
    </div></nav>
    {quickAddOpen && <QuickAddSheet onClose={() => setQuickAddOpen(false)} />}
  </div>;
}
