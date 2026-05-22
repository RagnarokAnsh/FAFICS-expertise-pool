'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { adminApi } from '@/lib/api/admin.api';
import { Button } from '@/components/ui/Button';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await adminApi.login(email, password);
      Cookies.set('fafics_token', response.data.accessToken, { expires: 1 });
      Cookies.set('fafics_role', response.data.role, { expires: 1 });
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white px-4">
      <div className="max-w-[400px] w-full bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="bg-navy p-6 flex flex-col items-center">
          <div className="w-[50px] h-[50px] border-2 border-gold rounded-full flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C8973A" strokeWidth="1.5" className="w-6 h-6">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <h1 className="font-serif text-[22px] font-bold text-white tracking-[0.02em]">Officer Login</h1>
        </div>

        <form onSubmit={handleLogin} className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-6 border border-red-100">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full border border-border rounded h-[42px] px-3 text-[14px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] text-text-light font-medium uppercase tracking-[0.03em] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full border border-border rounded h-[42px] px-3 text-[14px] focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
