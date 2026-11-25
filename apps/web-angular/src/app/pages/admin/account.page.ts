import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import Cookies from 'js-cookie';
import {
  PasswordChecklistComponent,
  PasswordFieldComponent,
  isPasswordValid,
} from '../../components/admin/password-field';
import { ToastService } from '../../core/toast.service';
import { authApi } from '../../lib/api/admin.api';
import { roleLabel } from '../../lib/auth/roles';

/** app/admin/account/page.tsx */
@Component({
  selector: 'app-account-page',
  imports: [PasswordFieldComponent, PasswordChecklistComponent],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 max-w-[640px] mx-auto">
      <div class="mb-8">
        <p class="text-text-mid">Your sign-in details for the FAFICS dashboard.</p>
      </div>

      <!-- Identity -->
      <div class="mb-6 rounded-lg border border-border bg-white p-6 shadow-sm">
        <h2 class="mb-4 font-serif text-[17px] font-bold text-navy">Signed in as</h2>
        <dl class="grid grid-cols-[110px_1fr] gap-y-2.5 text-[14px]">
          <dt class="text-text-light">Email</dt>
          <dd class="font-medium text-navy">{{ me.data()?.email ?? '—' }}</dd>
          <dt class="text-text-light">Role</dt>
          <dd class="text-text-mid">{{ me.data()?.role ? roleLabel(me.data()?.role) : '—' }}</dd>
        </dl>
      </div>

      <!-- Change password -->
      <div class="rounded-lg border border-border bg-white p-6 shadow-sm">
        <h2 class="mb-1 font-serif text-[17px] font-bold text-navy">Change password</h2>
        <p class="mb-5 text-[13px] text-text-mid">
          You will be signed out on all devices and need to sign in again with the new password.
        </p>

        <form (submit)="handleSubmit($event)">
          @if (error()) {
            <div class="mb-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-[13px] text-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 h-4 w-4 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span class="whitespace-pre-line">{{ error() }}</span>
            </div>
          }

          <div class="mb-4">
            <div
              appPasswordField
              label="Current Password"
              [value]="currentPassword()"
              (valueChange)="currentPassword.set($event)"
              autoComplete="current-password"
            ></div>
          </div>

          <div class="mb-4">
            <div
              appPasswordField
              label="New Password"
              [value]="newPassword()"
              (valueChange)="newPassword.set($event)"
              autoComplete="new-password"
            ></div>
            <app-password-checklist [value]="newPassword()" />
          </div>

          <div class="mb-6">
            <div
              appPasswordField
              label="Confirm New Password"
              [value]="confirm()"
              (valueChange)="confirm.set($event)"
              autoComplete="new-password"
            ></div>
            @if (confirm() && newPassword() !== confirm()) {
              <p class="mt-1.5 text-[11.5px] text-danger">The two passwords do not match.</p>
            }
          </div>

          <button
            type="submit"
            [disabled]="isSubmitting()"
            class="flex h-[44px] items-center justify-center gap-2 rounded-lg bg-navy px-6 text-[14px] font-semibold text-white transition-all hover:bg-navy-mid hover:shadow-[0_4px_14px_rgba(13,34,64,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            @if (isSubmitting()) {
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg
              >Updating…
            } @else {
              Change Password
            }
          </button>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AccountPage {
  protected readonly roleLabel = roleLabel;
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirm = signal('');
  protected readonly error = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly me = injectQuery(() => ({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
  }));

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.error.set('');

    if (!this.currentPassword()) {
      this.error.set('Please enter your current password.');
      return;
    }
    if (!isPasswordValid(this.newPassword())) {
      this.error.set('Your new password must meet all four requirements below.');
      return;
    }
    if (this.newPassword() !== this.confirm()) {
      this.error.set('The two new passwords do not match.');
      return;
    }
    if (this.newPassword() === this.currentPassword()) {
      this.error.set('Your new password must be different from your current one.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      await authApi.changePassword(this.currentPassword(), this.newPassword());
      // The server clears the auth cookie on success, so the session is already
      // gone — drop the UI role hint and send the user back to sign in.
      Cookies.remove('fafics_role');
      this.toast.showToast('Password changed. Please sign in again.', 'success');
      this.router.navigateByUrl('/admin/login');
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : raw || 'Could not change your password.';
      this.error.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
