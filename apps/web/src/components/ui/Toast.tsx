import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
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
    <div className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow-lg z-[9999] ${bgColors[type]} animate-[fadeIn_0.3s_ease]`}>
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );

  const container = document.getElementById('toast-container');
  if (!container) return null;

  return createPortal(content, container);
}
