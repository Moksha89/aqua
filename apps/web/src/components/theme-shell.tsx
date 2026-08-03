'use client';

import { useEffect } from 'react';

type Theme = { tokens?: Record<string, string> };

export function ThemeShell({ children }: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    const token = window.localStorage.getItem('aqua_access_token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/theme`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => response.ok ? response.json() as Promise<Theme> : null)
      .then((theme) => {
        for (const [key, value] of Object.entries(theme?.tokens ?? {})) {
          if (/^#[0-9a-f]{6}$/i.test(value)) {
            const hex = value.slice(1);
            const rgb = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).join(' ');
            document.documentElement.style.setProperty(`--color-${key}`, rgb);
          }
        }
      });
  }, []);
  return children;
}
