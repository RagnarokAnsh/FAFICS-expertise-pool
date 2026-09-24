import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output } from '@angular/core';
import { PortalDirective } from '../../core/portal.directive';
import { ToastService, ToastType } from '../../core/toast.service';

/** components/ui/Toast.tsx — rendered into #toast-container like the React portal. */
@Component({
  selector: 'app-toast',
  imports: [PortalDirective],
  template: `
    <div appPortal="#toast-container" [class]="classes()" role="alert">
      <div class="flex items-center gap-3">
        <span class="text-[14px]">{{ message() }}</span>
        <button (click)="closed.emit()" class="text-white/80 hover:text-white shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ToastComponent implements OnInit {
  readonly message = input.required<string>();
  readonly type = input<ToastType>('info');
  readonly duration = input(4000);
  readonly closed = output<void>();
  private readonly destroyRef = inject(DestroyRef);

  protected readonly classes = computed(() => {
    const bgColors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' };
    return `fixed top-6 left-1/2 -translate-x-1/2 text-white px-4 py-2.5 rounded-lg shadow-lg z-[9999] max-w-[92vw] ${bgColors[this.type()]} animate-[fadeIn_0.3s_ease]`;
  });

  ngOnInit(): void {
    const timer = setTimeout(() => this.closed.emit(), this.duration());
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }
}

/** The app-wide toast outlet (ToastProvider's render). */
@Component({
  selector: 'app-toast-host',
  imports: [ToastComponent],
  template: `
    @for (toast of current(); track toast.key) {
      <app-toast [message]="toast.message" [type]="toast.type" (closed)="toasts.close()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
  protected readonly current = computed(() => {
    const toast = this.toasts.toast();
    return toast ? [toast] : [];
  });
}
