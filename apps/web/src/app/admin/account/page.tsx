'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/admin.api';
import { useToast } from '@/components/ui/Toast';
import { PasswordField, PasswordChecklist, isPasswordValid } from '@/components/admin/PasswordField';

export default function AdminAccountPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setError('Your new password must meet all four requirements below.');
      return;
    }
    if (newPassword !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Your new password must be different from your current one.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      // The server clears the auth cookie on success, so the session is already
      // gone — drop the UI role hint and send the user back to sign in.
      Cookies.remove('fafics_role');
      showToast('Password changed. Please sign in again.', 'success');
      router.push('/admin/login');
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : raw || 'Could not change your password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[640px] mx-auto">
      <div className="mb-8">
        <p className="text-text-mid">Your sign-in details for the FAFICS dashboard.</p>
      </div>

      {/* Identity */}
      <div className="mb-6 rounded-lg border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-[17px] font-bold text-navy">Signed in as</h2>
        <dl className="grid grid-cols-[110px_1fr] gap-y-2.5 text-[14px]">
          <dt className="text-text-light">Email</dt>
          <dd className="font-medium text-navy">{me?.email ?? '—'}</dd>
          <dt className="text-text-light">Role</dt>
          <dd className="capitalize text-text-mid">{me?.role ?? '—'}</dd>
        </dl>
      </div>

      {/* Change password */}
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-serif text-[17px] font-bold text-navy">Change password</h2>
        <p className="mb-5 text-[13px] text-text-mid">
          You will be signed out on all devices and need to sign in again with the new password.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-[13px] text-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}

          <div className="mb-4">
            <PasswordField
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
          </div>

          <div className="mb-4">
            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <PasswordChecklist value={newPassword} />
          </div>

          <div className="mb-6">
            <PasswordField
              label="Confirm New Password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
            {confirm && newPassword !== confirm && (
              <p className="mt-1.5 text-[11.5px] text-danger">The two passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-[44px] items-center justify-center gap-2 rounded-lg bg-navy px-6 text-[14px] font-semibold text-white transition-all hover:bg-navy-mid hover:shadow-[0_4px_14px_rgba(13,34,64,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating…
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
