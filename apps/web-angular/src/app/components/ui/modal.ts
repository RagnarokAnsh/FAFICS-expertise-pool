import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { PortalDirective } from '../../core/portal.directive';

/** components/ui/Modal.tsx (kept for parity — not currently used by any page). */
@Component({
  selector: 'app-modal',
  imports: [PortalDirective],
  template: `
    @if (isOpen()) {
      <div appPortal class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-[fadeIn_0.2s_ease]">
          <div class="flex items-center justify-between p-4 border-b">
            <h2 class="text-lg font-semibold">{{ heading() }}</h2>
            <button (click)="closed.emit()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="p-4 overflow-y-auto">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ModalComponent {
  readonly isOpen = input(false);
  readonly heading = input('');
  readonly closed = output<void>();

  constructor() {
    effect(() => {
      document.body.style.overflow = this.isOpen() ? 'hidden' : 'unset';
    });
    inject(DestroyRef).onDestroy(() => {
      document.body.style.overflow = 'unset';
    });
  }
}
