import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthErrorComponent, AuthShellComponent, AuthSubmitComponent } from '../../components/admin/auth-shell';
import { AutofocusDirective } from '../../core/autofocus.directive';
import { authApi } from '../../lib/api/admin.api';

/** app/admin/forgot-password/page.tsx */
@Component({
  selector: 'app-forgot-password-page',
  imports: [RouterLink, AuthShellComponent, AuthErrorComponent, AuthSubmitComponent, AutofocusDirective],
  template: `
    @if (sent()) {
      <app-auth-shell heading="Check your email" subtitle="FAFICS Expertise Pool — password reset" [hasFooter]="true">
        <div class="p-8 text-center">
          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6 text-success">
              <path d="M4 4h16v16H4z" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
          </div>
          <p class="text-[14px] text-text">
            If an account exists for <strong class="text-navy">{{ email().trim() }}</strong>, a password reset link has
            been sent to it.
          </p>
          <p class="mt-3 text-[13px] text-text-mid">
            The link is valid for one hour and can only be used once. Remember to check your spam folder.
          </p>
          <button
            type="button"
            (click)="useDifferentEmail()"
            class="mt-6 text-[13px] font-medium text-navy underline underline-offset-2 transition-colors hover:text-gold"
          >
            Use a different email address
          </button>
        </div>
        <a authFooter routerLink="/admin/login" class="text-[13px] text-white/50 transition-colors hover:text-white/80"
          >← Back to sign in</a
        >
      </app-auth-shell>
    } @else {
      <app-auth-shell heading="Forgot password" subtitle="FAFICS Expertise Pool — password reset" [hasFooter]="true">
        <form (submit)="handleSubmit($event)" class="p-8">
          @if (error()) {
            <app-auth-error [message]="error()" />
          }

          <p class="mb-5 text-[13px] leading-relaxed text-text-mid">
            Enter the email address for your dashboard account and we will send you a link to choose a new password.
          </p>

          <div class="mb-6">
            <label class="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-text-mid">Email Address</label>
            <input
              type="email"
              required
              appAutofocus
              autocomplete="email"
              placeholder="you@fafics.org"
              class="h-[44px] w-full rounded-lg border-[1.5px] border-border px-3.5 text-[14px] text-text transition-colors placeholder:text-text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
            />
          </div>

          <button appAuthSubmit [isLoading]="isLoading()" loadingLabel="Sending…">Send Reset Link</button>
        </form>
        <a authFooter routerLink="/admin/login" class="text-[13px] text-white/50 transition-colors hover:text-white/80"
          >← Back to sign in</a
        >
      </app-auth-shell>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ForgotPasswordPage {
  protected readonly email = signal('');
  protected readonly error = signal('');
  protected readonly isLoading = signal(false);
  protected readonly sent = signal(false);

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.error.set('');
    this.isLoading.set(true);

    try {
      await authApi.forgotPassword(this.email().trim());
      // The API answers identically for registered and unregistered addresses,
      // so this screen must not hint at which one it was.
      this.sent.set(true);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429) {
        this.error.set('Too many requests. Please wait a minute and try again.');
      } else {
        const raw = err.response?.data?.message;
        this.error.set(Array.isArray(raw) ? raw.join('\n') : raw || 'Something went wrong. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  protected useDifferentEmail(): void {
    this.sent.set(false);
    this.email.set('');
  }
}
