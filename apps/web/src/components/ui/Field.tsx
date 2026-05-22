import React from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className="text-[12px] font-semibold text-text tracking-[0.02em] uppercase">
        {label} {required && <span className="text-gold ml-[2px]">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-[11.5px] text-text-muted mt-[-2px]">{hint}</span>}
      {error && <span className="text-[11.5px] text-danger mt-[-2px]">{error}</span>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }>(
  (props, ref) => {
    const { hasError, className, ...rest } = props;
    return (
      <input
        ref={ref}
        {...rest}
        className={`h-[40px] px-3 border-[1.5px] border-border rounded-[7px] font-sans text-[14px] text-text bg-off-white transition-colors outline-none focus:border-navy-mid focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] ${
          hasError ? '!border-danger !bg-[#fff5f5]' : ''
        } ${className || ''}`}
      />
    );
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }>(
  (props, ref) => {
    const { hasError, className, children, ...rest } = props;
    return (
      <select
        ref={ref}
        {...rest}
        className={`h-[40px] px-3 pr-9 border-[1.5px] border-border rounded-[7px] font-sans text-[14px] text-text bg-off-white transition-colors outline-none focus:border-navy-mid focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] appearance-none ${
          hasError ? '!border-danger !bg-[#fff5f5]' : ''
        } ${className || ''}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238892aa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
        }}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }>(
  (props, ref) => {
    const { hasError, className, ...rest } = props;
    return (
      <textarea
        ref={ref}
        {...rest}
        className={`w-full max-w-full min-h-[110px] p-[10px_12px] resize-y border-[1.5px] border-border rounded-[7px] font-sans text-[14px] text-text bg-off-white transition-colors outline-none focus:border-navy-mid focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] ${
          hasError ? '!border-danger !bg-[#fff5f5]' : ''
        } ${className || ''}`}
      />
    );
  }
);
TextArea.displayName = 'TextArea';
