import React from 'react';
import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
  href?: string;
}

export function StatCard({ label, value, color, href }: StatCardProps) {
  const cardContent = (
    <div className={`bg-white rounded-lg shadow-sm border border-border p-6 flex flex-col h-full border-l-4 ${color}`}>
      <span className="text-[12px] font-semibold text-text-light tracking-[0.03em] uppercase mb-2">
        {label}
      </span>
      <span className="text-[32px] font-serif font-bold text-navy leading-none mb-4">
        {value}
      </span>
      {href && (
        <div className="mt-auto flex items-center text-[12px] font-semibold text-gold group-hover:text-gold-hover transition-colors">
          View Details
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group h-full block">
        {cardContent}
      </Link>
    );
  }

  return <div className="h-full block">{cardContent}</div>;
}
