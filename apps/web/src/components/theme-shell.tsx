'use client';

import { useEffect } from 'react';
import { apiGet } from '../lib/api';

type Theme = { tokens?: Record<string, string> };

export function ThemeShell({ children }: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    const apply = (theme?: Theme) => {
      for (const [key, value] of Object.entries(theme?.tokens ?? {})) {
        if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) continue;
        const hex = value.slice(1);
        const rgb = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).join(' ');
        document.documentElement.style.setProperty(`--color-${key}`, rgb);
      }
    };
    try { apply(JSON.parse(window.localStorage.getItem('aqua_theme') ?? 'null') as Theme); } catch { /* use defaults */ }
    apiGet<Theme>('/theme').then((theme) => {
      window.localStorage.setItem('aqua_theme', JSON.stringify(theme));
      apply(theme);
    }).catch(() => undefined);
  }, []);
  return children;
}
