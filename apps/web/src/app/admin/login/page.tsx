'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { adminApi } from '@/lib/api/admin.api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await adminApi.login(email, password);
      // The JWT is set by the server as an HttpOnly cookie (not readable by JS).
      // We only keep the non-sensitive role here for UI gating.
      Cookies.set('fafics_role', result.role, { expires: 1 });
      router.push('/admin/dashboard');
    } catch (err: any) {
      // Every failure used to read "Invalid email or password", which made the
      // rate limiter indistinguishable from a wrong password: after 5 attempts
      // the API returns 429 and the correct password looked wrong too.
      const status = err.response?.status;
      if (status === 429) {
        setError(
          'Too many sign-in attempts. For security, further attempts are blocked for about a minute — wait, then try again.',
        );
      } else if (status === 401) {
        setError('Invalid email or password.');
      } else if (!err.response) {
        setError('Could not reach the server. Check your connection and try again.');
      } else {
        const raw = err.response?.data?.message;
        setError(Array.isArray(raw) ? raw.join('\n') : raw || 'Sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-navy to-[#0a1a30] px-4 py-10 overflow-hidden">
      {/* Decorative gold glow */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-gold/[0.06] blur-3xl" />

      <div className="relative w-full max-w-[420px]">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center">
            <Image src="/logo.png" alt="FAFICS" width={72} height={72} className="h-full w-full object-contain" priority />
          </div>
          <h1 className="font-serif text-[26px] font-bold text-white tracking-[0.02em]">Officer Login</h1>
          <p className="mt-1 text-[13px] text-white/55">FAFICS Expertise Pool — Volunteer access</p>
        </div>

        {/* Card */}
        <div className="rounded-theme border border-white/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="h-1 bg-gold" />
          <form onSubmit={handleLogin} className="p-8">
            {error && (
              <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-[13px] text-danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-text-mid">
                Email Address
              </label>
              <input
                type="email"
                required
                autoFocus
                placeholder="you@fafics.org"
                className="h-[44px] w-full rounded-lg border-[1.5px] border-border px-3.5 text-[14px] text-text transition-colors placeholder:text-text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-text-mid">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="h-[44px] w-full rounded-lg border-[1.5px] border-border pl-3.5 pr-10 text-[14px] text-text transition-colors placeholder:text-text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link
                  href="/admin/forgot-password"
                  className="text-[12.5px] font-medium text-navy transition-colors hover:text-gold"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-navy text-[14px] font-semibold text-white transition-all hover:bg-navy-mid hover:shadow-[0_4px_14px_rgba(13,34,64,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-[13px] text-white/50 transition-colors hover:text-white/80">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
