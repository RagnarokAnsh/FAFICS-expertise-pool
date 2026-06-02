import React from 'react';

// ── Card matching the demo's `.report-card` ──────────────────────────────────
export function ReportCard({
  title,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`rounded-theme border border-border bg-white p-5 shadow-theme ${className}`}>
      {title && (
        <div className="mb-3.5 flex items-center justify-between border-b border-border pb-2.5">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.05em] text-navy">{title}</h4>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

// ── Section header matching the demo's `.sec-head` ───────────────────────────
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        {title && <h3 className="font-serif text-[16px] font-bold text-navy">{title}</h3>}
        {subtitle && <p className="text-[13px] text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-[#eaf3de] text-success',
  submitted: 'bg-[#fff8e6] text-[#c07a00]',
  endorsed: 'bg-navy-light text-navy-mid',
  under_review: 'bg-navy-light text-navy-mid',
  changes_requested: 'bg-[#fff8e6] text-[#c07a00]',
  rejected: 'bg-[#fdecea] text-danger',
  expired: 'bg-off-white text-text-muted border border-border',
  draft: 'bg-off-white text-text-muted border border-border',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Active',
  submitted: 'Pending',
  endorsed: 'Endorsed',
  under_review: 'In Review',
  changes_requested: 'Changes',
  rejected: 'Rejected',
  expired: 'Expired',
  draft: 'Draft',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-[10px] px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.04em] ${
        STATUS_STYLES[status] ?? 'bg-off-white text-text-muted'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Inline SVG icons (1px stroke, currentColor) ──────────────────────────────
const ic = (path: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="h-10 w-10">
    {path}
  </svg>
);

export const ICONS = {
  users: ic(
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>,
  ),
  clock: ic(
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>,
  ),
  globe: ic(
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>,
  ),
  grid: ic(
    <>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>,
  ),
};
