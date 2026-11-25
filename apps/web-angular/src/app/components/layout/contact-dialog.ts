import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal
} from '@angular/core';

import { ContactService } from '../../core/contact.service';

/**
 * Contact Us dialog — a modal overlay with email + message fields.
 * Styled to match the FAFICS navy/gold theme.
 */
@Component({
  selector: 'app-contact-dialog',
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      (click)="onBackdropClick($event)"
    >
      <!-- Dialog -->
      <div
        class="bg-white rounded-theme max-w-[480px] w-full shadow-[0_20px_60px_rgba(13,34,64,0.25)] overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="bg-navy px-6 py-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- <div class="w-[6px] h-[6px] rounded-full bg-gold shrink-0"></div> -->
            <h2 class="text-[15px] font-semibold text-white tracking-[0.03em] uppercase">Contact Us</h2>
          </div>
          <button
            type="button"
            class="text-white/50 hover:text-white transition-colors p-1 -mr-1"
            aria-label="Close"
            (click)="close.emit()"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <p class="text-[13px] text-text-mid mb-5 leading-relaxed">
            Have a question or need assistance? Send us a message and we'll get back to you as soon as possible.
          </p>

          <!-- Email field -->
          <label class="block mb-4">
            <span class="text-[13px] font-semibold text-text mb-1.5 block">Your Email</span>
            <input
              type="email"
              class="w-full border border-border rounded-lg px-3.5 py-[10px] text-[14px] text-text
                     placeholder:text-text-muted focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy/20
                     transition-colors"
              placeholder="your.email@example.com"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
            />
          </label>

          <!-- Message field -->
          <label class="block mb-4">
            <span class="text-[13px] font-semibold text-text mb-1.5 block">Message</span>
            <textarea
              class="w-full border border-border rounded-lg px-3.5 py-[10px] text-[14px] text-text
                     placeholder:text-text-muted focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy/20
                     transition-colors min-h-[120px] resize-y"
              placeholder="How can we help you?"
              [value]="message()"
              (input)="message.set($any($event.target).value)"
            ></textarea>
          </label>

          <!-- Validation error -->
          @if (error()) {
            <p class="text-danger text-[13px] mb-4">{{ error() }}</p>
          }

          <!-- Success message -->
          @if (sent()) {
            <div class="flex items-center gap-2 bg-[#eafaf0] border border-success/20 rounded-lg px-4 py-3 mb-4">
              <svg class="w-5 h-5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-[13px] text-success font-medium">Your message has been sent successfully!</span>
            </div>
          }

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              class="px-5 py-[10px] text-[13px] font-medium text-text-mid border border-border rounded-lg
                     hover:border-navy hover:text-navy hover:bg-navy-light transition-colors"
              (click)="close.emit()"
            >Cancel</button>
            <button
              type="button"
              class="px-5 py-[10px] text-[13px] font-semibold text-white bg-gold rounded-lg border border-transparent
                     hover:bg-[#b5842e] hover:-translate-y-[1px] hover:shadow-[0_4px_14px_rgba(200,151,58,0.35)]
                     transition-all duration-150"
              [disabled]="sending()"
              (click)="handleSend()"
            >
              {{ sending() ? 'Sending…' : 'Send Message' }}
            </button>
          </div>

          <!-- <p class="text-[11px] text-text-muted mt-4 text-center">
            Or email us directly at
            <a href="mailto:support@fafics.com?bcc=expool@fafics.com" class="text-navy font-semibold hover:underline">support&#64;fafics.com</a>
          </p> -->
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ContactDialogComponent {
  private readonly contactService = inject(ContactService);

  readonly close = output();

  protected readonly email = signal('');
  protected readonly message = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  protected async handleSend(): Promise<void> {
    if (this.sending() || this.sent()) {
      return;
    }

    this.error.set(null);

    const emailVal = this.email().trim();
    const msgVal = this.message().trim();

    if (!emailVal) {
      this.error.set('Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    if (emailVal.length > 254) {
      this.error.set('Email address is too long.');
      return;
    }

    if (!msgVal) {
      this.error.set('Please enter a message.');
      return;
    }

    if (msgVal.length > 5000) {
      this.error.set('Message cannot exceed 5000 characters.');
      return;
    }

    this.sending.set(true);

    try {
      const response = await this.contactService.sendMessage({
        email: emailVal,
        message: msgVal,
      });

      if (response?.success) {
        this.sent.set(true);
        this.email.set('');
        this.message.set('');
        this.error.set(null);

        // Show success message for 1.5 seconds
        setTimeout(() => {
          this.close.emit();
        }, 1500);
      } else {
        this.error.set(
          response?.message || 'Unable to send your message.'
        );
      }

    } catch (error: any) {
      const status = error?.response?.status;
      if (!error?.response) {
        this.error.set(
          'Unable to connect to the server. Please try again.'
        );
      } else if (status === 429) {
        this.error.set(
          'Too many requests. Please try again later.'
        );
      } else {
        // Validation errors arrive as a list; show the generic text for those.
        const serverMessage = error?.response?.data?.message;

        this.error.set(
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Unable to send your message. Please try again.'
        );
      }

    } finally {
      this.sending.set(false);
    }
  }
}
