'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api/admin.api';
import { AuthShell, AuthError, AuthSubmit } from '@/components/admin/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email.trim());
      // The API answers identically for registered and unregistered addresses,
      // so this screen must not hint at which one it was.
      setSent(true);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429) {
        setError('Too many requests. Please wait a minute and try again.');
      } else {
        const raw = err.response?.data?.message;
        setError(Array.isArray(raw) ? raw.join('\n') : raw || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const backToLogin = (
    <Link href="/admin/login" className="text-[13px] text-white/50 transition-colors hover:text-white/80">
      ← Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="FAFICS Expertise Pool — password reset"
        footer={backToLogin}
      >
        <div className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-success">
              <path d="M4 4h16v16H4z" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
          </div>
          <p className="text-[14px] text-text">
            If an account exists for <strong className="text-navy">{email.trim()}</strong>, a password
            reset link has been sent to it.
          </p>
          <p className="mt-3 text-[13px] text-text-mid">
            The link is valid for one hour and can only be used once. Remember to check your spam folder.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
            className="mt-6 text-[13px] font-medium text-navy underline underline-offset-2 transition-colors hover:text-gold"
          >
            Use a different email address
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="FAFICS Expertise Pool — password reset"
      footer={backToLogin}
    >
      <form onSubmit={handleSubmit} className="p-8">
        {error && <AuthError message={error} />}

        <p className="mb-5 text-[13px] leading-relaxed text-text-mid">
          Enter the email address for your dashboard account and we will send you a link to choose a
          new password.
        </p>

        <div className="mb-6">
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-text-mid">
            Email Address
          </label>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@fafics.org"
            className="h-[44px] w-full rounded-lg border-[1.5px] border-border px-3.5 text-[14px] text-text transition-colors placeholder:text-text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <AuthSubmit isLoading={isLoading} loadingLabel="Sending…">
          Send Reset Link
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
