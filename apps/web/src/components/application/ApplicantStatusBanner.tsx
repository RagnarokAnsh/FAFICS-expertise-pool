import React from 'react';
import Link from 'next/link';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../lib/utils/date';

interface ApplicantStatusBannerProps {
  application: {
    referenceNumber: string;
    status: string;
    expiresAt?: string | null;
  };
}

/** What each status means for the applicant, in their words. */
function statusMessage(status: string, expiresAt?: string | null): React.ReactNode {
  switch (status) {
    case 'submitted':
      return 'Your application is awaiting endorsement from your Association President.';
    case 'changes_requested':
      return (
        <>
          Your application was returned to you for changes. Use the editing link in your email to update it, or request a new
          one from the{' '}
          <Link href="/status" className="text-navy font-semibold hover:underline">
            Application Status page
          </Link>
          .
        </>
      );
    case 'endorsed':
    case 'under_review':
      return 'Your application is being reviewed by the FAFICS Secretary.';
    case 'approved':
      return expiresAt
        ? `Your application has been approved. Your profile is active in the FAFICS Expertise Pool until ${formatDate(expiresAt)}.`
        : 'Your application has been approved. Your profile is active in the FAFICS Expertise Pool.';
    case 'rejected':
      return 'Your application was not accepted at this time. Please contact secretary@fafics.org for more information.';
    case 'expired':
      return (
        <>
          Your profile has expired. You are welcome to{' '}
          <Link href="/apply" className="text-navy font-semibold hover:underline">
            submit a new application
          </Link>
          .
        </>
      );
    default:
      return null;
  }
}

/** Header of the applicant's read-only view of their own application. */
export function ApplicantStatusBanner({ application }: ApplicantStatusBannerProps) {
  const message = statusMessage(application.status, application.expiresAt);
  return (
    <div className="bg-navy-light border border-navy/10 rounded-lg p-5 mb-8">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <h1 className="text-[18px] font-serif font-bold text-navy">Your submitted application</h1>
        <Badge status={application.status} />
      </div>
      <p className="text-[14px] text-text-mid mb-2">
        Reference <span className="font-semibold text-navy">{application.referenceNumber}</span>. This is a read-only copy of
        the application you submitted; you cannot make changes on this page.
      </p>
      {message && <p className="text-[14px] text-text-mid">{message}</p>}
    </div>
  );
}
