'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Public site header + footer. The admin section has its own shell
 * (sidebar + topbar), so this chrome is hidden on /admin routes to avoid
 * a duplicate FAFICS header.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="bg-navy sticky top-0 z-[100] shadow-[0_2px_20px_rgba(0,0,0,0.25)]">
        <div className="max-w-[1020px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-[46px] h-[46px] border-2 border-gold rounded-full flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#C8973A" strokeWidth="1.5" className="w-6 h-6">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <div>
              <div className="font-serif text-[15px] font-bold text-white tracking-[0.02em]">FAFICS</div>
              <div className="text-[11px] text-white/55 tracking-[0.05em] uppercase mt-[1px] hidden md:block">
                Federation of Associations of Former International Civil Servants
              </div>
            </div>
          </div>
          <div className="text-[12px] text-gold font-medium tracking-[0.04em] uppercase border border-gold/35 px-3 py-1 rounded-full">
            Expertise Pool
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        {children}
      </div>

      <footer className="bg-navy px-8 py-[18px] text-center mt-10 mt-auto">
        <p className="text-[12px] text-white/40">© {new Date().getFullYear()} FAFICS. All rights reserved.</p>
      </footer>
    </>
  );
}
