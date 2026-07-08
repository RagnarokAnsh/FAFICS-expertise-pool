import React from 'react';
import { Card } from '../ui/Card';
import Link from 'next/link';
import { Button } from '../ui/Button';

export function TokenExpiredResume() {
  return (
    <div className="max-w-[600px] mx-auto py-12 px-4 min-h-[calc(100vh-160px)] flex flex-col justify-center">
      <Card title="">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-[32px]">⏳</span>
          </div>
          <h2 className="font-serif text-[28px] font-bold text-navy mb-4">This editing link has expired</h2>
          <p className="text-[15px] text-text-mid mb-8">
            For security, editing links are only valid for a limited time. To continue editing your application, request a new link.
          </p>
          <Link href="/status">
            <Button variant="primary">Go to Status Page</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
