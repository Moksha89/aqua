import './globals.css';
import { QueryProvider } from '../src/components/query-provider';
import { ThemeShell } from '../src/components/theme-shell';
import { AppShell } from '../src/components/app-shell';
import { I18nProvider } from '../src/lib/i18n';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="bg-background text-textPrimary"><QueryProvider><I18nProvider><ThemeShell><AppShell>{children}</AppShell></ThemeShell></I18nProvider></QueryProvider></body></html>;
}
