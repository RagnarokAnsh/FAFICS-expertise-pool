import React from 'react';
import Link from 'next/link';

type Accent = 'navy' | 'gold' | 'success' | 'pending';

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: Accent;
  sub?: string;
  icon?: React.ReactNode;
  href?: string;
}

const ACCENT_BAR: Record<Accent, string> = {
  navy: 'bg-navy',
  gold: 'bg-gold',
  success: 'bg-success',
  pending: 'bg-[#c07a00]',
};

export function StatCard({ label, value, accent = 'navy', sub, icon, href }: StatCardProps) {
  const card = (
    <div className="relative h-full overflow-hidden rounded-theme border border-border bg-white p-5 shadow-theme transition-shadow group-hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-[3px] ${ACCENT_BAR[accent]}`} />
      {icon && (
        <div className="pointer-events-none absolute right-3.5 top-3.5 text-navy opacity-[0.07]">
          {icon}
        </div>
      )}
      <div className="mb-1 font-serif text-[34px] font-bold leading-none text-navy">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">{label}</div>
      {sub && <div className="mt-2 text-[11px] text-text-muted">{sub}</div>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block h-full">
        {card}
      </Link>
    );
  }
  return <div className="h-full">{card}</div>;
}
