import React, { useState } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';

interface ActionButtonsProps {
  applicationId: string;
  status: string;
}

export function ActionButtons({ applicationId, status }: ActionButtonsProps) {
  const queryClient = useQueryClient();
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'requestChanges' | 'note' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    if ((modalType === 'reject' || modalType === 'requestChanges' || modalType === 'note') && !notes.trim()) {
      setError('Notes are required for this action.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (modalType === 'approve') await adminApi.approve(applicationId, notes);
      else if (modalType === 'reject') await adminApi.reject(applicationId, notes);
      else if (modalType === 'requestChanges') await adminApi.requestChanges(applicationId, notes);
      else if (modalType === 'note') await adminApi.addNotes(applicationId, notes);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      
      setModalType(null);
      setNotes('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while performing the action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalConfig = () => {
    switch (modalType) {
      case 'approve': return { title: 'Approve Application', desc: 'Optional notes for the applicant:', btnClass: 'bg-green-600 hover:bg-green-700 text-white', btnText: 'Approve' };
      case 'reject': return { title: 'Reject Application', desc: 'Required reason for rejection (shared with applicant):', btnClass: 'bg-red-600 hover:bg-red-700 text-white', btnText: 'Reject' };
      case 'requestChanges': return { title: 'Request Changes', desc: 'Required explanation of what needs to be changed (shared with applicant):', btnClass: 'bg-amber-600 hover:bg-amber-700 text-white', btnText: 'Request Changes' };
      case 'note': return { title: 'Add Internal Note', desc: 'Notes are only visible to officers.', btnClass: 'bg-navy hover:bg-navy-hover text-white', btnText: 'Save Note' };
      default: return null;
    }
  };

  const config = getModalConfig();

  return (
    <>
      <div className="flex flex-col gap-3">
        {(status === 'endorsed' || status === 'under_review') && (
          <>
            <Button onClick={() => setModalType('approve')} className="bg-green-600 hover:bg-green-700 text-white w-full text-left justify-start">✓ Approve Application</Button>
            <Button onClick={() => setModalType('requestChanges')} className="bg-amber-600 hover:bg-amber-700 text-white w-full text-left justify-start">↻ Request Changes</Button>
            <Button onClick={() => setModalType('reject')} className="bg-red-600 hover:bg-red-700 text-white w-full text-left justify-start">✗ Reject Application</Button>
          </>
        )}
        
        {status === 'changes_requested' && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded text-sm mb-2 border border-amber-100">
            <strong>Awaiting Resubmission</strong><br/>
            The applicant has been asked to make changes and resubmit.
          </div>
        )}

        {status === 'approved' && (
          <div className="bg-green-50 text-green-800 p-4 rounded text-sm mb-2 border border-green-100">
            <strong>Active in Pool</strong><br/>
            This application has been fully approved.
          </div>
        )}

        <Button variant="ghost" onClick={() => setModalType('note')} className="w-full text-left justify-start">
          + Add Internal Note
        </Button>
      </div>

      {modalType && config && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-serif font-bold text-navy mb-4">{config.title}</h3>
            <p className="text-sm text-text-mid mb-4">{config.desc}</p>

            <textarea
              className="w-full border border-border rounded p-3 text-sm min-h-[120px] mb-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex items-center justify-end gap-3 mt-4">
              <Button variant="ghost" onClick={() => setModalType(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleAction} disabled={isSubmitting} className={config.btnClass}>
                {isSubmitting ? 'Processing...' : config.btnText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
