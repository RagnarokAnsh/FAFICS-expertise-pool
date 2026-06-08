'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin.api';
import { Button } from '@/components/ui/Button';

export default function AdminExpiringPage() {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const { data: expiringList, isLoading } = useQuery({
    queryKey: ['expiring-applications'],
    queryFn: adminApi.getExpiring,
  });

  const handleSendReminder = async (ids: string[]) => {
    setIsSending(true);
    setMessage(null);
    try {
      await adminApi.sendReminders(ids);
      setMessage({ type: 'success', text: `Sent ${ids.length} reminder(s) successfully.` });
      queryClient.invalidateQueries({ queryKey: ['expiring-applications'] });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send reminders.' });
    } finally {
      setIsSending(false);
    }
  };

  const calculateDaysLeft = (expiresAt: string) => {
    const diffTime = Math.abs(new Date(expiresAt).getTime() - new Date().getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysLeftColor = (days: number) => {
    if (days < 30) return 'text-red-600 bg-red-50 border border-red-200';
    if (days <= 60) return 'text-amber-600 bg-amber-50 border border-amber-200';
    return 'text-yellow-700 bg-yellow-50 border border-yellow-200';
  };

  if (isLoading) return <div className="p-8 text-text-light">Loading expiring profiles...</div>;

  const applications = expiringList || [];
  const allIds = applications.map((a: any) => a.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-text-mid">Profiles expiring within the next 90 days.</p>
        </div>
        <Button 
          onClick={() => handleSendReminder(allIds)} 
          disabled={applications.length === 0 || isSending}
        >
          {isSending ? 'Sending...' : 'Send All Reminders'}
        </Button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="bg-white border border-border p-8 rounded-lg text-center text-text-mid">
          No profiles are expiring in the next 90 days.
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Name</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Association</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Country</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Approved Date</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Expiry Date</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Days Left</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-navy uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app: any) => {
                const daysLeft = calculateDaysLeft(app.expiresAt);
                return (
                  <tr key={app.id} className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-[14px] text-navy font-semibold">{[app.firstName, app.lastName].filter(Boolean).join(' ')}</td>
                    <td className="py-3 px-4 text-[14px] text-text-mid">{app.associationName}</td>
                    <td className="py-3 px-4 text-[14px] text-text-mid">{app.associationCountry}</td>
                    <td className="py-3 px-4 text-[14px] text-text-light">{new Date(app.approvedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-[14px] text-navy font-medium">{new Date(app.expiresAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[12px] font-bold ${getDaysLeftColor(daysLeft)}`}>
                        {daysLeft} days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => handleSendReminder([app.id])}
                        disabled={isSending}
                        className="text-[12px] font-semibold text-gold hover:text-gold-hover hover:underline disabled:opacity-50"
                      >
                        Send Reminder
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
