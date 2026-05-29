import React from 'react';
import { Card } from '../ui/Card';
import Link from 'next/link';
import { Button } from '../ui/Button';

interface NotEditableMessageProps {
  status: string;
}

export function NotEditableMessage({ status }: NotEditableMessageProps) {
  let message = '';
  
  if (status === 'submitted') {
    message = 'Your application is awaiting endorsement from your Association President. You cannot edit it at this stage.';
  } else if (status === 'endorsed' || status === 'under_review') {
    message = 'Your application is currently being reviewed by the FAFICS Secretary. Editing is not available during this stage.';
  } else if (status === 'approved') {
    message = 'Your application has been approved. Your profile is active in the FAFICS Expertise Pool.';
  } else if (status === 'rejected') {
    message = 'Your application was not accepted at this time. Please contact secretary@fafics.org for more information.';
  } else if (status === 'expired') {
    message = 'Your profile has expired. You are welcome to submit a new application.';
  } else {
    message = 'This application cannot be edited at this time.';
  }

  return (
    <div className="max-w-[600px] mx-auto py-12 px-4">
      <Card title="Application Locked">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#e8edf5] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-[32px]">🔒</span>
          </div>
          <p className="text-[15px] text-text-mid mb-8">
            {message}
          </p>
          {status === 'expired' ? (
            <Link href="/apply">
              <Button variant="primary">Apply again →</Button>
            </Link>
          ) : (
            <Link href="/status">
              <Button variant="ghost">Return to Status Page</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
