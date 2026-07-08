'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/apply', label: 'Apply' },
  { href: '/status', label: 'Check Status' },
];

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

  // "/" counts as the Apply tab; each other tab matches its route prefix.
  const isActive = (href: string) =>
    href === '/apply'
      ? pathname === '/' || pathname?.startsWith('/apply')
      : pathname?.startsWith(href);
  const isOfficerActive = pathname?.startsWith('/admin');

  return (
    <>
      <header className="bg-navy sticky top-0 z-[100] shadow-[0_2px_20px_rgba(0,0,0,0.25)]">
        <div className="max-w-[1020px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3.5 shrink-0">
            <div className="w-[46px] h-[46px] flex items-center justify-center shrink-0">
              <Image src="/logo.png" alt="FAFICS" width={46} height={46} className="w-full h-full object-contain" priority />
            </div>
            <div className="text-[11px] text-white/55 tracking-[0.05em] uppercase hidden md:block max-w-[280px] leading-snug">
              Federation of Associations of Former International Civil Servants
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`relative px-2.5 sm:px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${
                  isActive(link.href)
                    ? 'text-gold font-semibold after:absolute after:left-2.5 after:right-2.5 after:bottom-0 after:h-[2px] after:rounded-full after:bg-gold'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              aria-current={isOfficerActive ? 'page' : undefined}
              className={`ml-1 sm:ml-2 px-3 py-1.5 text-[12px] font-medium border rounded-full transition-colors whitespace-nowrap ${
                isOfficerActive
                  ? 'text-navy bg-gold border-gold font-semibold'
                  : 'text-gold/90 border-gold/35 hover:bg-gold/10'
              }`}
            >
              Officer Login
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        {children}
      </div>

      <footer className="bg-navy px-8 py-[18px] text-center mt-10 mt-auto">
        <p className="text-[12px] text-white/40">
          © {new Date().getFullYear()} FAFICS. All rights reserved.
          <span className="mx-2 text-white/20">·</span>
          <Link href="/admin/login" className="text-white/40 hover:text-white/70 transition-colors">
            Officer Login
          </Link>
        </p>
      </footer>
    </>
  );
}
