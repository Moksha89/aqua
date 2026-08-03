import './globals.css';
import { QueryProvider } from '../src/components/query-provider';
import { ThemeShell } from '../src/components/theme-shell';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="bg-background text-textPrimary"><QueryProvider><ThemeShell>{children}</ThemeShell></QueryProvider></body></html>;
}
