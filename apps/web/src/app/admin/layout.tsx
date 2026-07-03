'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { useQuery } from '@tanstack/react-query';
import ReactQueryProvider from '@/components/providers/ReactQueryProvider';
import { GetSupportButton } from '@ragnarokansh/cimp-connect/react';
import { adminApi } from '@/lib/api/admin.api';

const NAV_SECTIONS: {
  label: string;
  links: { href: string; label: string; icon: string; badge?: 'pending' }[];
}[] = [
  {
    label: 'Main',
    links: [
      { href: '/admin/dashboard', label: 'Overview', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
      { href: '/admin/applications', label: 'Applications', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', badge: 'pending' },
      { href: '/admin/roster', label: 'Expertise Pool', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    ],
  },
  {
    label: 'Insights',
    links: [
      { href: '/admin/expiring', label: 'Expiring Profiles', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/admin/reports', label: 'Reports & Analytics', icon: 'M18 20V10M12 20V4M6 20v-6' },
      { href: '/admin/export', label: 'Export', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
    ],
  },
];

const TITLES: { match: string; title: string }[] = [
  { match: '/admin/dashboard', title: 'Overview' },
  { match: '/admin/applications', title: 'Applications' },
  { match: '/admin/roster', title: 'Expertise Pool' },
  { match: '/admin/expiring', title: 'Expiring Profiles' },
  { match: '/admin/reports', title: 'Reports & Analytics' },
  { match: '/admin/export', title: 'Export' },
  { match: '/admin/users', title: 'User Management' },
];

function PendingBadge() {
  const { data } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getStats, refetchInterval: 60000 });
  const count = data?.pendingEndorsement ?? 0;
  if (!count) return null;
  return (
    <span className="ml-auto rounded-[10px] bg-gold px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
  );
}

function Sidebar({ role, pathname, onLogout, onNavigate }: { role: string | null; pathname: string; onLogout: () => void; onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col overflow-y-auto bg-navy lg:sticky lg:top-0 lg:h-screen">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-[14px]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
          <Image src="/logo.png" alt="FAFICS" width={36} height={36} className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="font-serif text-[14px] font-bold text-gold leading-none">FAFICS</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.06em] text-white/40">Officer Dashboard</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4" onClick={onNavigate}>
        {NAV_SECTIONS.map((section) => {
          return (
            <div key={section.label}>
              <div className="mb-1.5 mt-3.5 px-2 text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">
                {section.label}
              </div>
              {section.links.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                      active ? 'bg-gold/[0.18] text-gold' : 'text-white/55 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <svg className="h-[15px] w-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                    </svg>
                    <span className="truncate">{link.label}</span>
                    {link.badge === 'pending' && <PendingBadge />}
                  </Link>
                );
              })}
            </div>
          );
        })}
        {role === 'admin' && (
          <div>
            <div className="mb-1.5 mt-3.5 px-2 text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">Admin</div>
            <Link
              href="/admin/users"
              className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                pathname.startsWith('/admin/users') ? 'bg-gold/[0.18] text-gold' : 'text-white/55 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <svg className="h-[15px] w-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="truncate">User Management</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 px-5 py-3.5">
        <div className="mb-2 text-[11.5px] capitalize text-white/40">Signed in as {role ?? 'Officer'}</div>
        <GetSupportButton
          handoffUrl={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/support/handoff`}
          className="mb-2 flex items-center gap-1.5 text-[12px] text-white/40 transition-colors hover:text-gold"
        />
        <button onClick={onLogout} className="flex items-center gap-1.5 text-[12px] text-white/40 transition-colors hover:text-gold">
          <svg className="h-[13px] w-[13px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [today, setToday] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    // The JWT is an HttpOnly cookie JS can't read; gate the UI on the readable
    // role hint instead. The API still enforces auth on every request, and a
    // 401 from an expired session redirects here via the admin API interceptor.
    const userRole = Cookies.get('fafics_role');
    if (!userRole && !pathname.includes('/admin/login')) {
      router.push('/admin/login');
    } else {
      setRole(userRole || null);
      setIsMounted(true);
      setToday(new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // Ignore network errors — we clear the client state and redirect regardless.
    }
    Cookies.remove('fafics_role');
    router.push('/admin/login');
  };

  if (pathname.includes('/admin/login')) {
    return <>{children}</>;
  }

  if (!isMounted) {
    return <div className="min-h-screen bg-off-white" />;
  }

  const title = TITLES.find((t) => pathname.startsWith(t.match))?.title ?? 'Dashboard';

  return (
    <ReactQueryProvider>
      <div className="flex min-h-screen bg-off-white">
        {/* Desktop sidebar (static) */}
        <div className="hidden lg:flex">
          <Sidebar role={role} pathname={pathname} onLogout={handleLogout} />
        </div>

        {/* Mobile drawer + backdrop */}
        <div className={`fixed inset-0 z-[120] lg:hidden ${mobileNavOpen ? '' : 'pointer-events-none'}`}>
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mobileNavOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className={`absolute left-0 top-0 h-full transition-transform duration-200 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <Sidebar role={role} pathname={pathname} onLogout={handleLogout} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-[62px] items-center gap-3 border-b border-border bg-white px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy transition-colors hover:bg-off-white lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="truncate font-serif text-[19px] font-bold text-navy sm:text-[24px]">{title}</h1>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ReactQueryProvider>
  );
}
