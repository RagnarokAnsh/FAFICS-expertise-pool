'use client';

import React from 'react';
import { Card } from '../../../../components/ui/Card';
import Link from 'next/link';
import { Button } from '../../../../components/ui/Button';

export default function ErrorPage() {
  return (
    <div className="max-w-[600px] mx-auto py-12 px-4">
      <Card title="">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-[32px]">⏳</span>
          </div>
          <h2 className="font-serif text-[28px] font-bold text-navy mb-4">This editing link is invalid or has expired.</h2>
          <p className="text-[15px] text-text-mid mb-8">
            Editing links are valid for 3 hours and can only be used once. To continue editing your application, request a new link.
          </p>
          <Link href="/status">
            <Button variant="primary">Request a new link →</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
