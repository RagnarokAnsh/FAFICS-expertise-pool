import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  message: string;
  type: ToastType;
  key: number;
}

/** App-wide toast state — the Angular counterpart of the React ToastProvider. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<ToastState | null>(null);
  private key = 0;

  showToast(message: string, type: ToastType = 'info'): void {
    this.key += 1;
    this.toast.set({ message, type, key: this.key });
  }

  close(): void {
    this.toast.set(null);
  }
}
