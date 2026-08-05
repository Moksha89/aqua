'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export function FarmMark({ light = false }: { light?: boolean }) {
  return <span className={`farm-mark ${light ? 'farm-mark-light' : ''}`} aria-label="AE Farm mark">
    <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6c6.4 7.2 11 13 11 18.6A11 11 0 0 1 13 24.6C13 19 17.6 13.2 24 6Z" /><path d="M15 33c4.4 3.4 8 3.4 9 1.2 1-2.2-1.4-4-5-4.6-3.6-.6-5.6.6-4 3.4Z" /><circle cx="30.5" cy="35.5" r="4.5" /></svg>
  </span>;
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <header className="app-topbar">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="display-title">{title}</h1>
      {subtitle && <p className="muted mt-2 text-sm">{subtitle}</p>}
    </div>
    {action}
  </header>;
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const content = <div className={`card ${className}`}>{children}</div>;
  return onClick ? <button className="block w-full text-left" onClick={onClick}>{content}</button> : content;
}

export function StatCard({ label, value, unit, tone = 'primary' }: { label: string; value: string; unit?: string; tone?: 'primary' | 'success' | 'warning' }) {
  return <div className="stat-card">
    <p className="muted text-xs font-bold">{label}</p>
    <p className={`stat-value ${tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-primary'}`}>{value} {unit && <small className="text-sm font-bold">{unit}</small>}</p>
  </div>;
}

export function FigureCard({ label, figure, onDerivation }: { label: string; figure?: { value?: string | null; unit?: string; status?: string; reason?: string }; onDerivation?: () => void }) {
  const unavailable = !figure?.value || figure.status === 'NOT_DETERMINABLE';
  return <Card className="card-pad">
    <div className="flex items-start justify-between gap-3">
      <p className="muted text-xs font-bold">{label}</p>
      {figure?.status && figure.status !== 'AVAILABLE' && <span className="chip">{figure.status === 'ESTIMATED' ? 'ESTIMATED' : 'NOT DETERMINABLE'}</span>}
    </div>
    <p className="stat-value">{unavailable ? '—' : figure.value} <small className="text-sm font-bold">{figure?.unit}</small></p>
    {unavailable && figure?.reason && <p className="muted mt-1 text-xs">{figure.reason}</p>}
    {onDerivation && <button type="button" className="mt-3 text-xs font-bold text-primary" onClick={onDerivation}>How is this derived?</button>}
  </Card>;
}

export function Field({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="field-label">{label}<input className="field-input" required={required} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function EmptyState({ icon = 'ph-drop', title, body, action }: { icon?: string; title: string; body: string; action?: ReactNode }) {
  return <Card className="card-pad text-center">
    <i className={`ph-duotone ${icon} text-5xl text-primary`} />
    <h2 className="mt-3 text-lg font-extrabold">{title}</h2>
    <p className="muted mt-2 text-sm">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </Card>;
}

export function ActionButton({ children, href, secondary = false, type = 'button', onClick }: { children: ReactNode; href?: string; secondary?: boolean; type?: 'button' | 'submit'; onClick?: () => void }) {
  const className = secondary ? 'secondary-button tap inline-flex items-center justify-center' : 'primary-button tap inline-flex items-center justify-center';
  return href ? <Link className={className} href={href}>{children}</Link> : <button className={className} type={type} onClick={onClick}>{children}</button>;
}
