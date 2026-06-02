'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { Button } from '@/components/ui/Button';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('secretary');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.listUsers,
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await adminApi.createUser({ email, password, role, firstName, lastName });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsModalOpen(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      setPassword('');
      setRole('secretary');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminApi.updateRole(userId, newRole);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err) {
      alert('Failed to update role.');
    }
  };

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-text-mid">Manage officer and admin access to the dashboard.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ Add New User</Button>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-text-light">Loading users...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Email</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Role</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Created</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user: any) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 text-[14px] text-navy font-medium">{user.email}</td>
                  <td className="py-3 px-4 text-[14px] text-text-mid capitalize">{user.role}</td>
                  <td className="py-3 px-4 text-[14px] text-text-light">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="border border-border rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="secretary">Secretary</option>
                      <option value="committee">Committee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-serif font-bold text-navy mb-4">Create New User</h3>
            
            <form onSubmit={handleCreateUser}>
              {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
              
              <div className="mb-4">
                <label className="block text-[11px] text-text-light font-medium uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border rounded p-2 text-sm"
                />
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-[11px] text-text-light font-medium uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-border rounded p-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] text-text-light font-medium uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-border rounded p-2 text-sm"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] text-text-light font-medium uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-border rounded p-2 text-sm"
                />
              </div>

              <div className="mb-6">
                <label className="block text-[11px] text-text-light font-medium uppercase mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-border rounded p-2 text-sm bg-white"
                >
                  <option value="secretary">Secretary (Read/Write Applications)</option>
                  <option value="committee">Committee (Read Only)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
