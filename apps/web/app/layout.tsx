import './globals.css';
import { QueryProvider } from '../src/components/query-provider';
import { ThemeShell } from '../src/components/theme-shell';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let theme: { tokens?: Record<string, string> } | null = null;
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000'}/api/v1/theme`, { cache: 'no-store' });
    if (response.ok) theme = await response.json() as { tokens?: Record<string, string> };
  } catch { /* API may be unavailable during static builds. */ }
  return <html lang="en"><body className="bg-background text-textPrimary"><QueryProvider><ThemeShell theme={theme}>{children}</ThemeShell></QueryProvider></body></html>;
}
