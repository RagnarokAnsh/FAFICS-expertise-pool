'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/admin.api';
import { AuthShell, AuthError, AuthSubmit } from '@/components/admin/AuthShell';
import { PasswordField, PasswordChecklist, isPasswordValid } from '@/components/admin/PasswordField';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const rawToken = Array.isArray(params?.token) ? params.token[0] : (params?.token as string);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  /** Set when the token itself is rejected — the form is useless from then on. */
  const [linkDead, setLinkDead] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid(password)) {
      setError('Please choose a password that meets all four requirements below.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(rawToken, password);
      setDone(true);
      // Send them to the login page shortly after, so the success state is read.
      setTimeout(() => router.push('/admin/login'), 2500);
    } catch (err: any) {
      const status = err.response?.status;
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : raw;

      // 404 = no such token, 410 = expired or already used. Either way the link
      // can never work again, so hide the form and offer a fresh one.
      if (status === 404 || status === 410) {
        setLinkDead(true);
        setError(msg || 'This reset link is no longer valid.');
      } else if (status === 429) {
        setError('Too many attempts. Wait about a minute and try again.');
      } else {
        setError(msg || 'Could not reset your password. Please try again.');
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

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="FAFICS Expertise Pool" footer={backToLogin}>
        <div className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-success">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[14px] text-text">Your password has been changed.</p>
          <p className="mt-2 text-[13px] text-text-mid">Taking you to the sign-in page…</p>
        </div>
      </AuthShell>
    );
  }

  if (linkDead) {
    return (
      <AuthShell title="Link no longer valid" subtitle="FAFICS Expertise Pool" footer={backToLogin}>
        <div className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-danger">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="text-[14px] text-text">{error}</p>
          <p className="mt-3 text-[13px] text-text-mid">
            Reset links expire after one hour and can only be used once.
          </p>
          <Link
            href="/admin/forgot-password"
            className="mt-6 inline-flex h-[44px] items-center justify-center rounded-lg bg-navy px-5 text-[14px] font-semibold text-white transition-all hover:bg-navy-mid"
          >
            Request a New Link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="FAFICS Expertise Pool" footer={backToLogin}>
      <form onSubmit={handleSubmit} className="p-8">
        {error && <AuthError message={error} />}

        <div className="mb-4">
          <PasswordField
            label="New Password"
            value={password}
            onChange={setPassword}
            autoFocus
            autoComplete="new-password"
          />
          <PasswordChecklist value={password} />
        </div>

        <div className="mb-6">
          <PasswordField
            label="Confirm New Password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          {confirm && password !== confirm && (
            <p className="mt-1.5 text-[11.5px] text-danger">The two passwords do not match.</p>
          )}
        </div>

        <AuthSubmit isLoading={isLoading} loadingLabel="Updating…">
          Update Password
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
