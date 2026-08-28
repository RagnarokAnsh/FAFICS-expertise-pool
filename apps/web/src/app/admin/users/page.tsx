'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, authApi } from '@/lib/api/admin.api';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils/date';
import { useToast } from '@/components/ui/Toast';
import { PasswordField, PasswordChecklist, isPasswordValid } from '@/components/admin/PasswordField';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
}

/** Pulls a readable message out of a NestJS error, which may be a string or an array. */
function apiMessage(err: any, fallback: string): string {
  const raw = err?.response?.data?.message;
  if (Array.isArray(raw)) return raw.join('\n');
  return raw || fallback;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  /** Id of the row with an action in flight, so only that row's buttons disable. */
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: adminApi.listUsers,
  });

  // Used to stop an admin from deleting or deactivating themselves in the UI.
  // The API enforces the same rules; this just avoids offering a dead button.
  const { data: me } = useQuery({ queryKey: ['auth-me'], queryFn: authApi.me });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const handleSendReset = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      await adminApi.sendUserPasswordReset(user.id);
      showToast(`Password reset link sent to ${user.email}.`, 'success');
    } catch (err: any) {
      showToast(apiMessage(err, 'Failed to send the reset link.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      await adminApi.updateUser(user.id, { isActive: !user.isActive });
      showToast(
        user.isActive
          ? `${user.email} deactivated — they can no longer sign in.`
          : `${user.email} reactivated.`,
        'success',
      );
      refresh();
    } catch (err: any) {
      showToast(apiMessage(err, 'Failed to update the account.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await adminApi.deleteUser(deleting.id);
      showToast(`${deleting.email} deleted.`, 'success');
      setDeleting(null);
      refresh();
    } catch (err: any) {
      showToast(apiMessage(err, 'Failed to delete the account.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-text-mid">Manage officer and admin access to the dashboard.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>+ Add New User</Button>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-text-light">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Name</th>
                  <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Email</th>
                  <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Status</th>
                  <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Last Sign-In</th>
                  <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Created</th>
                  <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase text-right w-px whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => {
                  const isSelf = me?.userId === user.id;
                  const busy = busyId === user.id;
                  return (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 text-[14px] text-navy font-medium">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                        {isSelf && (
                          <span className="ml-2 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-navy">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[14px] text-text-mid">{user.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${
                            user.isActive
                              ? 'bg-success/10 text-success'
                              : 'bg-text-muted/15 text-text-light'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.isActive ? 'bg-success' : 'bg-text-muted'
                            }`}
                          />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[14px] text-text-light">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-[14px] text-text-light">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4 w-px whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditing(user)}
                            disabled={busy}
                            className="inline-flex h-[26px] items-center rounded border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 border-border text-navy hover:enabled:bg-navy hover:enabled:text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleSendReset(user)}
                            disabled={busy || !user.isActive}
                            title={
                              user.isActive
                                ? 'Email this user a link to set a new password'
                                : 'Reactivate the account first'
                            }
                            className="inline-flex h-[26px] items-center rounded border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 border-border text-navy hover:enabled:bg-navy hover:enabled:text-white"
                          >
                            Send Reset
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={busy || isSelf}
                            title={isSelf ? 'You cannot deactivate your own account' : undefined}
                            className="inline-flex h-[26px] items-center rounded border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 border-border text-text-mid hover:enabled:bg-text-mid hover:enabled:text-white"
                          >
                            {user.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            onClick={() => setDeleting(user)}
                            disabled={busy || isSelf}
                            title={isSelf ? 'You cannot delete your own account' : undefined}
                            className="inline-flex h-[26px] items-center rounded border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 border-danger/30 text-danger hover:enabled:bg-danger hover:enabled:text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-light">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <CreateUserModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            refresh();
          }}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <DeleteUserDialog
          user={deleting}
          isDeleting={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Modals ──────────────────────────────────────────────────────────────────

const REQUIRED_STAR = <span className="text-gold ml-0.5">*</span>;
const INPUT_CLASS = 'w-full border border-border rounded p-2 text-sm';
const LABEL_CLASS = 'block text-[11px] text-text-light font-medium uppercase mb-1';

function ModalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-serif font-bold text-navy mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid(password)) {
      setError('The password must meet all four requirements below.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await adminApi.createUser({
        email: email.trim(),
        password,
        role: 'admin',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      showToast('User created successfully.', 'success');
      onCreated();
    } catch (err: any) {
      const msg = apiMessage(err, 'Failed to create user.');
      setError(msg);
      showToast(msg.split('\n')[0], 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell title="Create New User">
      <form onSubmit={handleSubmit} noValidate>
        {error && <div className="mb-4 text-danger text-sm whitespace-pre-line">{error}</div>}

        <div className="mb-4">
          <label className={LABEL_CLASS}>Email {REQUIRED_STAR}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className={LABEL_CLASS}>First Name {REQUIRED_STAR}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex-1">
            <label className={LABEL_CLASS}>Last Name {REQUIRED_STAR}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="mb-6">
          <PasswordField
            label="Temporary Password *"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordChecklist value={password} />
          <p className="mt-2 text-[11.5px] text-text-light">
            Share this with the new user, or create the account and use “Reset Password” to email
            them a link instead.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [email, setEmail] = useState(user.email);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await adminApi.updateUser(user.id, {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      showToast('User updated.', 'success');
      onSaved();
    } catch (err: any) {
      const msg = apiMessage(err, 'Failed to update user.');
      setError(msg);
      showToast(msg.split('\n')[0], 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell title="Edit User">
      <form onSubmit={handleSubmit} noValidate>
        {error && <div className="mb-4 text-danger text-sm whitespace-pre-line">{error}</div>}

        <div className="mb-4">
          <label className={LABEL_CLASS}>Email {REQUIRED_STAR}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className={LABEL_CLASS}>First Name {REQUIRED_STAR}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex-1">
            <label className={LABEL_CLASS}>Last Name {REQUIRED_STAR}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <p className="mb-6 rounded bg-gray-50 p-3 text-[12px] text-text-mid">
          Passwords cannot be set from here. Use <strong>Reset Password</strong> on the user list to
          email this person a link so they can choose their own.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteUserDialog({
  user,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  user: AdminUser;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <ModalShell title="Delete User">
      <p className="mb-4 text-[14px] text-text">
        This permanently removes <strong className="text-navy">{user.email}</strong>. Their entries in
        the audit trail are kept, but the account cannot be restored.
      </p>
      <p className="mb-4 rounded border border-gold/30 bg-gold/5 p-3 text-[12.5px] text-text-mid">
        Prefer <strong>Deactivate</strong> if you only need to block sign-in — it is reversible and
        keeps every record attached to the account.
      </p>

      <div className="mb-6">
        <label className={LABEL_CLASS}>Type the email address to confirm</label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={user.email}
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canDelete || isDeleting}
          className="rounded-lg bg-danger px-5 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete Permanently'}
        </button>
      </div>
    </ModalShell>
  );
}
