'use client';

import { useEffect } from 'react';

type Theme = { tokens?: Record<string, string> };

export function ThemeShell({ theme, children }: Readonly<{ theme: Theme | null; children: React.ReactNode }>) {
  useEffect(() => {
    for (const [key, value] of Object.entries(theme?.tokens ?? {})) {
      if (/^#[0-9a-f]{6}$/i.test(value)) {
        const hex = value.slice(1);
        const rgb = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).join(' ');
        document.documentElement.style.setProperty(`--color-${key}`, rgb);
      }
    }
  }, [theme]);
  return children;
}
