import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="bg-white border border-border rounded-theme shadow-theme mb-5 overflow-hidden">
      <div className="bg-navy px-[22px] py-3 flex items-center gap-[10px]">
        <div className="w-[6px] h-[6px] rounded-full bg-gold shrink-0"></div>
        <h3 className="text-[13px] font-semibold text-white tracking-[0.03em] uppercase">{title}</h3>
      </div>
      <div className="p-[22px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
