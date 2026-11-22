'use client';

import React from 'react';
import Link from 'next/link';

export default function ViewLinkError({ error, reset }: { error?: Error & { digest?: string }, reset?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-navy mb-2">Link Invalid or Expired</h2>
        <p className="text-text-mid mb-6">
          This link to view your application is invalid or has expired. You can request a new one from the Application Status
          page with your email address and reference number.
        </p>
        <Link
          href="/status"
          className="inline-block px-6 py-3 bg-navy text-white text-[14px] font-semibold rounded-lg hover:bg-navy-mid transition-colors mb-6"
        >
          Go to Application Status
        </Link>
        <p className="text-sm text-text-light">
          If you believe this is an error, please contact{' '}
          <a href="mailto:secretary@fafics.org" className="text-navy font-semibold hover:underline">
            secretary@fafics.org
          </a>
        </p>
      </div>
    </div>
  );
}
