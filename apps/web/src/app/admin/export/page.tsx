'use client';

import React, { useState } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import { Button } from '@/components/ui/Button';

export default function AdminExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await adminApi.exportRoster();
      setLastExport(new Date());
    } catch (err) {
      setError('Failed to download the Expertise Pool. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8 max-w-[800px] mx-auto">
      <div className="mb-8">
        <p className="text-text-mid">Download the current FAFICS Expertise Pool data.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-navy mb-2">Excel Export</h2>
              <p className="text-sm text-text-mid leading-relaxed">
                The export contains a complete spreadsheet of all <strong>Approved</strong> applications currently active in the Expertise Pool. It includes personal details, association info, full experience histories, and the complete expertise assessment.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded text-sm mb-6 border border-red-100">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-gray-100">
            <div className="text-sm text-text-light mb-4 sm:mb-0">
              {lastExport ? (
                <span>Last exported: {lastExport.toLocaleString()}</span>
              ) : (
                <span>Ready to download</span>
              )}
            </div>
            
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
              {isExporting ? 'Generating Excel...' : 'Download Expertise Pool (Excel)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
