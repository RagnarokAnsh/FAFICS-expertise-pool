'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Link rendered under the card. Defaults to "back to home". */
  footer?: React.ReactNode;
}

/**
 * The navy-gradient page frame shared by every unauthenticated officer screen
 * (login, forgot password, reset password) so they stay visually identical.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-navy to-[#0a1a30] px-4 py-10 overflow-hidden">
      {/* Decorative gold glow */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-gold/[0.06] blur-3xl" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center">
            <Image
              src="/logo.png"
              alt="FAFICS"
              width={72}
              height={72}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="font-serif text-[26px] font-bold text-white tracking-[0.02em]">{title}</h1>
          <p className="mt-1 text-[13px] text-white/55">{subtitle}</p>
        </div>

        <div className="rounded-theme border border-white/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="h-1 bg-gold" />
          {children}
        </div>

        <div className="mt-6 text-center">
          {footer ?? (
            <Link href="/" className="text-[13px] text-white/50 transition-colors hover:text-white/80">
              ← Back to home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Inline error banner matching the login form's styling. */
export function AuthError({ message }: { message: string }) {
  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-[13px] text-danger">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span className="whitespace-pre-line">{message}</span>
    </div>
  );
}

/** Inline success banner. */
export function AuthSuccess({ message }: { message: string }) {
  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg border border-success/25 bg-success/5 p-3 text-[13px] text-success">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      <span className="whitespace-pre-line">{message}</span>
    </div>
  );
}

/** Full-width submit button with the spinner state used across the auth screens. */
export function AuthSubmit({
  isLoading,
  loadingLabel,
  children,
  disabled,
}: {
  isLoading: boolean;
  loadingLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-navy text-[14px] font-semibold text-white transition-all hover:bg-navy-mid hover:shadow-[0_4px_14px_rgba(13,34,64,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
