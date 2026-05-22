'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import ReactQueryProvider from '@/components/providers/ReactQueryProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get('fafics_token');
    const userRole = Cookies.get('fafics_role');
    
    if (!token && !pathname.includes('/admin/login')) {
      router.push('/admin/login');
    } else {
      setRole(userRole || null);
      setIsMounted(true);
    }
  }, [pathname, router]);

  const handleLogout = () => {
    Cookies.remove('fafics_token');
    Cookies.remove('fafics_role');
    router.push('/admin/login');
  };

  if (!isMounted && !pathname.includes('/admin/login')) {
    return <div className="min-h-screen bg-off-white"></div>;
  }

  if (pathname.includes('/admin/login')) {
    return <>{children}</>;
  }

  const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { href: '/admin/applications', label: 'Applications', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/admin/expiring', label: 'Expiring', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/admin/export', label: 'Export', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
  ];

  if (role === 'admin') {
    navLinks.push({ href: '/admin/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' });
  }

  return (
    <div className="flex min-h-screen bg-off-white">
      {/* Sidebar */}
      <aside className="w-[240px] bg-navy flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 border-2 border-gold rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C8973A" strokeWidth="1.5" className="w-5 h-5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <div>
            <div className="font-serif font-bold text-white tracking-[0.02em]">FAFICS</div>
            <div className="text-[10px] text-white/55 tracking-[0.05em] uppercase">Expertise Pool</div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
                  isActive ? 'bg-gold/10 text-gold' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                <span className="text-[14px] font-medium tracking-[0.01em]">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[14px] font-medium tracking-[0.01em]">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </main>
    </div>
  );
}
