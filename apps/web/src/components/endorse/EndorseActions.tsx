'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { endorsementApi } from '../../lib/api/endorsement.api';

interface EndorseActionsProps {
  token: string;
}

export function EndorseActions({ token }: EndorseActionsProps) {
  const [modalState, setModalState] = useState<'none' | 'endorse' | 'return'>('none');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successType, setSuccessType] = useState<'endorse' | 'return' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEndorse = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await endorsementApi.endorse(token, notes || undefined);
      setSuccessType('endorse');
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while endorsing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!notes.trim()) {
      setError('Comments are required when returning an application.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await endorsementApi.return(token, notes);
      setSuccessType('return');
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while returning.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successType) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-navy rounded-full border-[3px] border-gold flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-navy mb-2">
          {successType === 'endorse' ? 'Profile Added to Expertise Pool' : 'Application Returned'}
        </h2>
        <p className="text-text-mid">
          {successType === 'endorse'
            ? 'The applicant has been notified. Their profile is now active in the FAFICS Expertise Pool with three-year validity.'
            : 'The applicant has been notified with your comments and can revise their application.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
        <Button 
          variant="ghost" 
          onClick={() => { setModalState('return'); setNotes(''); setError(null); }}
        >
          Return with Comments
        </Button>
        <Button 
          onClick={() => { setModalState('endorse'); setNotes(''); setError(null); }}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Endorse Application
        </Button>
      </div>

      {modalState !== 'none' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-serif font-bold text-navy mb-4">
              {modalState === 'endorse' ? 'Confirm Endorsement' : 'Return Application'}
            </h3>
            
            <p className="text-sm text-text-mid mb-4">
              {modalState === 'endorse'
                ? 'By endorsing this application, the applicant\'s profile will be immediately added to the FAFICS Expertise Pool with three-year validity. You may optionally leave a note.'
                : 'Please provide comments explaining why the application is being returned. These comments will be shared with the applicant.'}
            </p>

            <textarea
              className="w-full border border-border rounded p-3 text-sm min-h-[120px] mb-2"
              placeholder={modalState === 'endorse' ? "Optional notes..." : "Required comments..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex items-center justify-end gap-3 mt-4">
              <Button variant="ghost" onClick={() => setModalState('none')} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                onClick={modalState === 'endorse' ? handleEndorse : handleReturn}
                disabled={isSubmitting}
                className={modalState === 'endorse' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {isSubmitting ? 'Processing...' : modalState === 'endorse' ? 'Endorse' : 'Return'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
