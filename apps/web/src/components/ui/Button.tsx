import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'submit' | 'add' | 'remove';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  let baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-sans font-semibold cursor-pointer border transition-all duration-150 ';

  if (variant === 'primary') {
    baseClasses += 'px-6 py-[11px] text-[14px] bg-navy text-white border-transparent hover:bg-navy-mid hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(13,34,64,0.25)]';
  } else if (variant === 'ghost') {
    baseClasses += 'px-6 py-[11px] text-[14px] bg-transparent text-text-mid border-[1.5px] border-border hover:border-navy hover:text-navy hover:bg-navy-light';
  } else if (variant === 'submit') {
    baseClasses += 'px-6 py-[11px] text-[14px] bg-gold text-white border-transparent hover:bg-[#b5842e] hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(200,151,58,0.35)]';
  } else if (variant === 'add') {
    baseClasses += 'px-4 py-2 text-[13px] bg-navy-light text-navy-mid border-[1.5px] border-dashed border-navy-mid hover:bg-navy hover:text-white hover:border-solid mt-1';
  } else if (variant === 'remove') {
    baseClasses += 'w-7 h-7 !p-0 rounded-full border-[1.5px] border-[#ffd0cc] bg-[#fff5f5] text-[#c0392b] text-[16px] leading-none hover:bg-[#ffe0de] hover:border-[#c0392b] mt-[7px] shrink-0';
  }

  return (
    <button className={`${baseClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}
