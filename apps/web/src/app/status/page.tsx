"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { applicationsApi } from '../../lib/api/applications.api';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

interface StatusFormData {
  referenceNumber: string;
  email: string;
}

export default function StatusPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<StatusFormData>();
  const [statusResult, setStatusResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: StatusFormData) => {
    setIsLoading(true);
    setErrorMsg(null);
    setStatusResult(null);

    try {
      const result = await applicationsApi.getStatus(data.email, data.referenceNumber);
      setStatusResult(result);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setErrorMsg('Application not found. Please check your Reference Number and Email.');
      } else {
        setErrorMsg('An error occurred while checking status. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white py-12 px-4">
      <div className="max-w-[600px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-serif text-[32px] font-bold text-navy mb-2">Check Application Status</h1>
          <p className="text-[15px] text-text-mid">
            Enter your tracking reference number and email to check the current status of your application in the FAFICS Expertise Pool.
          </p>
        </div>

        <Card title="Status Inquiry">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Reference Number" required error={errors.referenceNumber?.message}>
              <Input 
                placeholder="e.g. REF-12345678" 
                hasError={!!errors.referenceNumber}
                {...register('referenceNumber', { required: 'Reference number is required' })} 
              />
            </Field>

            <Field label="Email" required error={errors.email?.message}>
              <Input 
                type="email" 
                hasError={!!errors.email}
                {...register('email', { required: 'Email is required' })} 
              />
            </Field>

            {errorMsg && (
              <div className="p-3 bg-[#fff5f5] border border-danger text-danger text-[13px] rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" variant="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Check Status'}
              </Button>
            </div>
          </form>
        </Card>

        {statusResult && (
          <div className="mt-8 animate-[fadeIn_0.3s_ease]">
            <Card title="Application Status">
              <div className="text-center py-6">
                <div className="inline-block px-4 py-1.5 rounded-full text-[14px] font-bold tracking-wider uppercase mb-4"
                  style={{
                    backgroundColor: statusResult.status === 'SUBMITTED' ? '#dceeff' : 
                                     statusResult.status === 'PRESIDENT_ENDORSED' ? '#fac775' :
                                     statusResult.status === 'APPROVED' ? '#EAF3DE' :
                                     statusResult.status === 'REJECTED' ? '#fff5f5' : '#f0f0f0',
                    color: statusResult.status === 'SUBMITTED' ? '#185FA5' : 
                           statusResult.status === 'PRESIDENT_ENDORSED' ? '#85500b' :
                           statusResult.status === 'APPROVED' ? '#3B6D11' :
                           statusResult.status === 'REJECTED' ? '#c0392b' : '#666'
                  }}
                >
                  {statusResult.status.replace('_', ' ')}
                </div>
                
                <h3 className="text-[18px] font-bold text-navy mb-2">
                  {statusResult.applicantName}
                </h3>
                <p className="text-[14px] text-text-mid mb-6">
                  {statusResult.associationName}
                </p>

                <div className="text-left bg-off-white rounded-lg p-4 text-[13.5px] border border-border">
                  <div className="grid grid-cols-[120px_1fr] gap-2 mb-2">
                    <span className="text-text-muted font-medium">Submitted:</span>
                    <span className="text-text font-semibold">{new Date(statusResult.submittedAt).toLocaleDateString()}</span>
                  </div>
                  {statusResult.status === 'SUBMITTED' && (
                    <p className="mt-4 text-text-mid leading-relaxed">
                      Your application is currently awaiting endorsement from your Local Association President.
                    </p>
                  )}
                  {statusResult.status === 'PRESIDENT_ENDORSED' && (
                    <p className="mt-4 text-text-mid leading-relaxed">
                      Your application has been endorsed and is now under review by the FAFICS Secretariat.
                    </p>
                  )}
                  {statusResult.status === 'APPROVED' && (
                    <p className="mt-4 text-text-mid leading-relaxed">
                      Congratulations! Your profile has been approved and included in the FAFICS Expertise Pool.
                    </p>
                  )}
                  {statusResult.status === 'REJECTED' && (
                    <p className="mt-4 text-text-mid leading-relaxed">
                      Unfortunately, your application was not approved at this time.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
