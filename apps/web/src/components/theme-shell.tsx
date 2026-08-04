'use client';

import { useEffect } from 'react';
import { apiGet } from '../lib/api';

type Theme = { tokens?: Record<string, string> };

export function ThemeShell({ children }: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    apiGet<Theme>('/theme').then((theme) => {
        for (const [key, value] of Object.entries(theme?.tokens ?? {})) {
          if (/^#[0-9a-f]{6}$/i.test(value)) {
            const hex = value.slice(1);
            const rgb = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).join(' ');
            document.documentElement.style.setProperty(`--color-${key}`, rgb);
          }
        }
      }).catch(() => undefined);
  }, []);
  return children;
}
