"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  const content = (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 text-white px-4 py-2.5 rounded-lg shadow-lg z-[9999] max-w-[92vw] ${bgColors[type]} animate-[fadeIn_0.3s_ease]`} role="alert">
      <div className="flex items-center gap-3">
        <span className="text-[14px]">{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );

  const container = document.getElementById('toast-container');
  if (!container) return null;

  return createPortal(content, container);
}

/* ── App-wide toast context ── */

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null);
  const keyRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    keyRef.current += 1;
    setToast({ message, type, key: keyRef.current });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}

/** Safe no-op fallback so components don't crash outside the provider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? { showToast: () => {} };
}
