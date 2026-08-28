'use client';

import React, { useState } from 'react';

/**
 * Must stay in step with PASSWORD_PATTERN / PASSWORD_MIN_LENGTH in
 * apps/api/src/modules/auth/dto/password.dto.ts. Checked here only to give
 * immediate feedback — the API is the authority and re-validates every rule.
 */
export const PASSWORD_RULES = [
  { label: 'At least 12 characters', test: (v: string) => v.length >= 12 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
];

export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value)) && value.length <= 72;
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  required?: boolean;
}

export function PasswordField({
  label,
  value,
  onChange,
  placeholder = '••••••••',
  autoFocus,
  autoComplete,
  required = true,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-text-mid">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-[44px] w-full rounded-lg border-[1.5px] border-border pl-3.5 pr-10 text-[14px] text-text transition-colors placeholder:text-text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text focus:outline-none"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/** Live checklist of the password rules, shown while a new password is typed. */
export function PasswordChecklist({ value }: { value: string }) {
  if (!value) return null;

  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-[11.5px] ${ok ? 'text-success' : 'text-text-muted'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 shrink-0">
              {ok ? <path d="M5 13l4 4L19 7" /> : <circle cx="12" cy="12" r="9" />}
            </svg>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
