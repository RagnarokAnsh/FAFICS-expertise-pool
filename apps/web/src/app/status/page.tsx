"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { applicationsApi } from '../../lib/api/applications.api';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';

/* ─── helpers ─── */
function maskEmail(email: string) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain || local.length === 0) return email;
  return `${local[0]}***@${domain}`;
}

/** Approved profiles are valid for 3 years from the approval date. */
function computeExpiry(approvedAt: string | null | undefined): string {
  if (!approvedAt) return '—';
  const expiry = new Date(approvedAt);
  expiry.setFullYear(expiry.getFullYear() + 3);
  return expiry.toLocaleDateString();
}

/* ─── types ─── */
interface StatusFormData {
  referenceNumber: string;
  email: string;
}
interface DraftFormData {
  email: string;
}

/* ─── page ─── */
export default function StatusPage() {
  /* ── Section A state ── */
  const { register: regA, handleSubmit: submitA, formState: { errors: errA } } = useForm<StatusFormData>();
  const [statusResult, setStatusResult] = useState<any>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  // edit-link state (for submitted apps returned with changes_requested)
  const [isSendingEditLink, setIsSendingEditLink] = useState(false);
  const [editLinkSent, setEditLinkSent] = useState(false);
  const [queryEmail, setQueryEmail] = useState<string | null>(null);

  /* ── Section B state ── */
  const { register: regB, handleSubmit: submitB, formState: { errors: errB } } = useForm<DraftFormData>();
  const [isDraftSending, setIsDraftSending] = useState(false);
  const [draftLinkSent, setDraftLinkSent] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sendAgainTimer, setSendAgainTimer] = useState(0);

  /* ── countdown for "send again" ── */
  useEffect(() => {
    if (sendAgainTimer <= 0) return;
    const t = setTimeout(() => setSendAgainTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [sendAgainTimer]);

  /* ── Section A: check submitted application status ── */
  const onCheckStatus = async (data: StatusFormData) => {
    setIsCheckingStatus(true);
    setStatusError(null);
    setStatusResult(null);
    setEditLinkSent(false);
    setQueryEmail(data.email);

    try {
      const result = await applicationsApi.getStatus(data.email, data.referenceNumber);
      setStatusResult(result);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setStatusError(
          'No application found with that email and reference number. Note: reference numbers are only assigned after submission. If your application is still a draft, use the section below.'
        );
      } else {
        setStatusError('An error occurred while checking status. Please try again later.');
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleRequestEditLink = async () => {
    if (!statusResult || !statusResult.referenceNumber || !queryEmail) return;
    setIsSendingEditLink(true);
    try {
      await applicationsApi.requestEditLink(queryEmail, statusResult.referenceNumber);
      setEditLinkSent(true);
    } catch (error: any) {
      alert('An error occurred. Please try again.');
    } finally {
      setIsSendingEditLink(false);
    }
  };

  /* ── Section B: request draft link ── */
  const onRequestDraftLink = async (data: DraftFormData) => {
    setIsDraftSending(true);
    setDraftError(null);
    try {
      await applicationsApi.requestDraftLink(data.email);
      setDraftLinkSent(true);
      setSendAgainTimer(60);
    } catch (error: any) {
      setDraftError('Something went wrong. Please try again.');
    } finally {
      setIsDraftSending(false);
    }
  };

  const handleSendAgain = useCallback(() => {
    setDraftLinkSent(false);
    setDraftError(null);
  }, []);

  /* ── render ── */
  return (
    <div className="min-h-screen bg-off-white py-12 px-4">
      <div className="max-w-[600px] mx-auto">
        {/* Page heading */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-[32px] font-bold text-navy mb-2">Application Status</h1>
          <p className="text-[15px] text-text-mid">
            Track your FAFICS Expertise Pool application
          </p>
        </div>

        {/* ──────────── SECTION A — Check submitted application status ──────────── */}
        <Card title="Check Application Status">
          <form onSubmit={submitA(onCheckStatus)} className="space-y-4">
            <Field label="Email Address" required error={errA.email?.message}>
              <Input
                type="email"
                placeholder="your.email@example.com"
                hasError={!!errA.email}
                {...regA('email', { required: 'Email is required' })}
              />
            </Field>

            <Field label="Reference Number" required error={errA.referenceNumber?.message}>
              <Input
                placeholder="e.g. EP-0042"
                hasError={!!errA.referenceNumber}
                {...regA('referenceNumber', { required: 'Reference number is required' })}
              />
            </Field>

            {statusError && (
              <div className="p-3 bg-[#fff5f5] border border-danger text-danger text-[13px] rounded-lg">
                {statusError}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" variant="submit" className="w-full" disabled={isCheckingStatus}>
                {isCheckingStatus ? 'Checking...' : 'Check Status'}
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Status result (appears below Section A) ── */}
        {statusResult && (
          <div className="mt-6 animate-[fadeIn_0.3s_ease]">
            <Card title="Application Status">
              <div className="text-center py-6">
                <div className="inline-block px-4 py-1.5 rounded-full text-[14px] font-bold tracking-wider uppercase mb-4"
                  style={{
                    backgroundColor: statusResult.status === 'submitted' ? '#dceeff' :
                                     statusResult.status === 'endorsed' ? '#EEEDFE' :
                                     statusResult.status === 'approved' ? '#EAF3DE' :
                                     statusResult.status === 'rejected' ? '#fff5f5' :
                                     statusResult.status === 'changes_requested' ? '#fef3cd' :
                                     statusResult.status === 'under_review' ? '#e8edf5' :
                                     statusResult.status === 'expired' ? '#f0f0f0' : '#f0f0f0',
                    color: statusResult.status === 'submitted' ? '#185FA5' :
                           statusResult.status === 'endorsed' ? '#534AB7' :
                           statusResult.status === 'approved' ? '#3B6D11' :
                           statusResult.status === 'rejected' ? '#c0392b' :
                           statusResult.status === 'changes_requested' ? '#856404' :
                           statusResult.status === 'under_review' ? '#1a3a6b' :
                           statusResult.status === 'expired' ? '#666' : '#666'
                  }}
                >
                  {statusResult.status.replace(/_/g, ' ')}
                </div>

                <p className="text-[14px] text-navy font-semibold mb-1">
                  Reference: {statusResult.referenceNumber}
                </p>

                <div className="text-left bg-off-white rounded-lg p-4 text-[13.5px] border border-border mt-4">
                  <div className="grid grid-cols-[120px_1fr] gap-2 mb-2">
                    <span className="text-text-muted font-medium">Submitted:</span>
                    <span className="text-text font-semibold">{statusResult.submittedAt ? new Date(statusResult.submittedAt).toLocaleDateString() : '—'}</span>
                  </div>
                  {statusResult.endorsedAt && (
                    <div className="grid grid-cols-[120px_1fr] gap-2 mb-2">
                      <span className="text-text-muted font-medium">Endorsed:</span>
                      <span className="text-text font-semibold">{new Date(statusResult.endorsedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {statusResult.approvedAt && (
                    <div className="grid grid-cols-[120px_1fr] gap-2 mb-2">
                      <span className="text-text-muted font-medium">Approved:</span>
                      <span className="text-text font-semibold">{new Date(statusResult.approvedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {statusResult.status === 'submitted' && (
                    <p className="mt-4 text-text-mid leading-relaxed">
                      Your application is awaiting endorsement from your Association President. You cannot edit it at this stage.
                    </p>
                  )}
                  {(statusResult.status === 'endorsed' || statusResult.status === 'under_review') && (
                    <p className="mt-4 text-text-mid leading-relaxed">
                      Your application is currently being reviewed by the FAFICS Secretary. Editing is not available during this stage.
                    </p>
                  )}
                  {statusResult.status === 'approved' && (
                    <p className="mt-4 text-text-mid leading-relaxed">
                      Your application has been approved. Your profile is active in the FAFICS Expertise Pool until {computeExpiry(statusResult.approvedAt)}.
                    </p>
                  )}
                  {statusResult.status === 'rejected' && (
                    <p className="mt-4 text-text-mid leading-relaxed">
                      Your application was not accepted at this time. Please contact secretary@fafics.org for more information.
                    </p>
                  )}
                  {statusResult.status === 'expired' && (
                    <div className="mt-4 text-text-mid leading-relaxed">
                      <p>Your profile has expired. You are welcome to submit a new application.</p>
                      <Link href="/apply" className="text-gold font-semibold hover:underline mt-2 inline-block">Apply again →</Link>
                    </div>
                  )}
                </div>

                {/* Edit link section for draft / changes_requested */}
                {(statusResult.status === 'draft' || statusResult.status === 'changes_requested') && (
                  <div className="mt-6 border-t border-border pt-6 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[20px]">✏️</span>
                      <h3 className="font-serif text-[18px] font-bold text-navy">Continue editing your application</h3>
                    </div>

                    {statusResult.status === 'changes_requested' ? (
                      <p className="text-[14px] text-text-mid mb-5">
                        Your Association President has returned your application with comments.
                        Open the editing link sent to your email to see their feedback and make the requested changes.
                      </p>
                    ) : (
                      <p className="text-[14px] text-text-mid mb-5">
                        Your application has not been submitted yet. Click below to continue where you left off.
                      </p>
                    )}

                    {editLinkSent ? (
                      <div className="p-4 bg-[#eaf3de] text-[#3b6d11] rounded-lg text-[14px] font-medium border border-[#c4e1a4]">
                        ✓ Editing link sent! Check your email inbox (and spam folder). The link is valid for 3 hours.
                      </div>
                    ) : (
                      <>
                        <Button onClick={handleRequestEditLink} disabled={isSendingEditLink} className="bg-gold hover:bg-[#d49925] text-white">
                          {isSendingEditLink ? 'Sending...' : 'Send me an editing link'}
                        </Button>
                        {queryEmail && (
                          <p className="text-[13px] text-text-muted mt-3">
                            A secure link will be sent to: {maskEmail(queryEmail)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ──────────── OR divider ──────────── */}
        <div className="flex items-center gap-4 my-10">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[14px] font-bold text-text-muted tracking-wider">— OR —</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ──────────── SECTION B — Retrieve a saved draft ──────────── */}
        <div className="bg-navy-light border border-navy/10 rounded-theme p-8 shadow-theme">
          <div className="flex items-start gap-4 mb-5">
            {/* FileText icon */}
            <div className="w-10 h-10 rounded-lg bg-navy/5 flex items-center justify-center shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-navy">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <line x1="10" x2="8" y1="9" y2="9" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-[20px] font-bold text-navy mb-1">Retrieve a saved draft</h2>
              <p className="text-[14px] text-text-mid leading-relaxed">
                If you started an application but haven&apos;t submitted it yet,
                enter your email address and we&apos;ll send you a link to continue where you left off.
              </p>
            </div>
          </div>

          {draftLinkSent ? (
            <div className="space-y-3">
              <div className="p-4 bg-[#eaf3de] text-[#3b6d11] rounded-lg text-[14px] font-medium border border-[#c4e1a4]">
                ✓ Link sent! Check your inbox (including spam folder). The link is valid for 30 days.
              </div>
              {sendAgainTimer > 0 ? (
                <p className="text-[13px] text-text-muted text-center">
                  You can send again in {sendAgainTimer}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendAgain}
                  className="text-[13px] text-navy font-semibold hover:underline block mx-auto"
                >
                  Send again
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={submitB(onRequestDraftLink)} className="space-y-4">
              <Field label="Email Address" required error={errB.email?.message}>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  hasError={!!errB.email}
                  {...regB('email', { required: 'Email is required' })}
                />
              </Field>

              {draftError && (
                <div className="p-3 bg-[#fff5f5] border border-danger text-danger text-[13px] rounded-lg">
                  {draftError}
                </div>
              )}

              <Button type="submit" variant="ghost" className="w-full border-navy text-navy hover:bg-navy hover:text-white" disabled={isDraftSending}>
                {isDraftSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : 'Send me my draft link'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
