import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthErrorComponent, AuthShellComponent, AuthSubmitComponent } from '../../components/admin/auth-shell';
import {
  PasswordChecklistComponent,
  PasswordFieldComponent,
  isPasswordValid,
} from '../../components/admin/password-field';
import { authApi } from '../../lib/api/admin.api';

/** app/admin/reset-password/[token]/page.tsx */
@Component({
  selector: 'app-reset-password-page',
  imports: [
    RouterLink,
    AuthShellComponent,
    AuthErrorComponent,
    AuthSubmitComponent,
    PasswordFieldComponent,
    PasswordChecklistComponent,
  ],
  template: `
    @if (done()) {
      <app-auth-shell heading="Password updated" subtitle="FAFICS Expertise Pool" [hasFooter]="true">
        <div class="p-8 text-center">
          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6 text-success">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p class="text-[14px] text-text">Your password has been changed.</p>
          <p class="mt-2 text-[13px] text-text-mid">Taking you to the sign-in page…</p>
        </div>
        <a authFooter routerLink="/admin/login" class="text-[13px] text-white/50 transition-colors hover:text-white/80"
          >← Back to sign in</a
        >
      </app-auth-shell>
    } @else if (linkDead()) {
      <app-auth-shell heading="Link no longer valid" subtitle="FAFICS Expertise Pool" [hasFooter]="true">
        <div class="p-8 text-center">
          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6 text-danger">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p class="text-[14px] text-text">{{ error() }}</p>
          <p class="mt-3 text-[13px] text-text-mid">Reset links expire after one hour and can only be used once.</p>
          <a
            routerLink="/admin/forgot-password"
            class="mt-6 inline-flex h-[44px] items-center justify-center rounded-lg bg-navy px-5 text-[14px] font-semibold text-white transition-all hover:bg-navy-mid"
            >Request a New Link</a
          >
        </div>
        <a authFooter routerLink="/admin/login" class="text-[13px] text-white/50 transition-colors hover:text-white/80"
          >← Back to sign in</a
        >
      </app-auth-shell>
    } @else if (checking()) {
      <app-auth-shell heading="Choose a new password" subtitle="FAFICS Expertise Pool" [hasFooter]="false">
        <p class="p-8 text-center text-[14px] text-text-mid">Checking your link…</p>
      </app-auth-shell>
    } @else {
      <app-auth-shell heading="Choose a new password" subtitle="FAFICS Expertise Pool" [hasFooter]="true">
        <form (submit)="handleSubmit($event)" class="p-8">
          @if (error()) {
            <app-auth-error [message]="error()" />
          }

          <div class="mb-4">
            <div
              appPasswordField
              label="New Password"
              [value]="password()"
              (valueChange)="password.set($event)"
              [autoFocus]="true"
              autoComplete="new-password"
            ></div>
            <app-password-checklist [value]="password()" />
          </div>

          <div class="mb-6">
            <div
              appPasswordField
              label="Confirm New Password"
              [value]="confirm()"
              (valueChange)="confirm.set($event)"
              autoComplete="new-password"
            ></div>
            @if (confirm() && password() !== confirm()) {
              <p class="mt-1.5 text-[11.5px] text-danger">The two passwords do not match.</p>
            }
          </div>

          <button appAuthSubmit [isLoading]="isLoading()" loadingLabel="Updating…">Update Password</button>
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
export class ResetPasswordPage {
  private readonly router = inject(Router);
  private readonly rawToken = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly error = signal('');
  protected readonly isLoading = signal(false);
  protected readonly done = signal(false);
  /** Set when the token itself is rejected — the form is useless from then on. */
  protected readonly linkDead = signal(false);
  /** True until the link has been checked, so a used link never shows the form. */
  protected readonly checking = signal(true);

  constructor() {
    authApi
      .checkResetLink(this.rawToken)
      .catch((err: any) => {
        const status = err.response?.status;
        if (status === 404 || status === 410) {
          this.linkDead.set(true);
          this.error.set('This reset link has expired or has already been used.');
        }
        // Any other failure (network, rate limit): show the form; submitting
        // still reports a dead link.
      })
      .finally(() => this.checking.set(false));
  }

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.error.set('');

    if (!isPasswordValid(this.password())) {
      this.error.set('Please choose a password that meets all four requirements below.');
      return;
    }
    if (this.password() !== this.confirm()) {
      this.error.set('The two passwords do not match.');
      return;
    }

    this.isLoading.set(true);
    try {
      await authApi.resetPassword(this.rawToken, this.password());
      this.done.set(true);
      // Send them to the login page shortly after, so the success state is read.
      setTimeout(() => this.router.navigateByUrl('/admin/login'), 2500);
    } catch (err: any) {
      const status = err.response?.status;
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : raw;

      // 404 = no such token, 410 = expired or already used. Either way the link
      // can never work again, so hide the form and offer a fresh one.
      if (status === 404 || status === 410) {
        this.linkDead.set(true);
        this.error.set(msg || 'This reset link is no longer valid.');
      } else if (status === 429) {
        this.error.set('Too many attempts. Wait about a minute and try again.');
      } else {
        this.error.set(msg || 'Could not reset your password. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
