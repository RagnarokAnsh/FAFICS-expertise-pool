import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The navy-gradient page frame shared by every unauthenticated officer screen
 * (login, forgot password, reset password) so they stay visually identical —
 * AuthShell from components/admin/AuthShell.tsx. Put `authFooter` on an element
 * to replace the default "Back to home" link.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink],
  template: `
    <div
      class="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-navy to-[#0a1a30] px-4 py-10 overflow-hidden"
    >
      <!-- Decorative gold glow -->
      <div class="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gold/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-gold/[0.06] blur-3xl"></div>

      <div class="relative w-full max-w-[420px]">
        <div class="mb-6 flex flex-col items-center text-center">
          <div class="mb-4 flex h-[72px] w-[72px] items-center justify-center">
            <img
              alt="FAFICS"
              fetchpriority="high"
              width="72"
              height="72"
              decoding="async"
              class="h-full w-full object-contain"
              style="color: transparent"
              src="logo.png"
            />
          </div>
          <h1 class="font-serif text-[26px] font-bold text-white tracking-[0.02em]">{{ heading() }}</h1>
          <p class="mt-1 text-[13px] text-white/55">{{ subtitle() }}</p>
        </div>

        <div class="rounded-theme border border-white/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
          <div class="h-1 bg-gold"></div>
          <ng-content />
        </div>

        <div class="mt-6 text-center">
          @if (hasFooter()) {
            <ng-content select="[authFooter]" />
          } @else {
            <a routerLink="/" class="text-[13px] text-white/50 transition-colors hover:text-white/80">← Back to home</a>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AuthShellComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input.required<string>();
  /** Set when an [authFooter] element is projected. */
  readonly hasFooter = input(false);
}

/** Inline error banner matching the login form's styling (AuthError). */
@Component({
  selector: 'app-auth-error',
  template: `
    <div class="mb-6 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-[13px] text-danger">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 h-4 w-4 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span class="whitespace-pre-line">{{ message() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AuthErrorComponent {
  readonly message = input.required<string>();
}

/** Inline success banner (AuthSuccess). */
@Component({
  selector: 'app-auth-success',
  template: `
    <div class="mb-6 flex items-start gap-2 rounded-lg border border-success/25 bg-success/5 p-3 text-[13px] text-success">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 h-4 w-4 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      <span class="whitespace-pre-line">{{ message() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AuthSuccessComponent {
  readonly message = input.required<string>();
}

/** Full-width submit button with the spinner state used across the auth screens (AuthSubmit). */
@Component({
  selector: 'button[appAuthSubmit]',
  template: `
    @if (isLoading()) {
      <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg
      >{{ loadingLabel() }}
    } @else {
      <ng-content />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'submit',
    '[disabled]': 'isLoading() || disabled()',
    class:
      'flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-navy text-[14px] font-semibold text-white transition-all hover:bg-navy-mid hover:shadow-[0_4px_14px_rgba(13,34,64,0.35)] disabled:cursor-not-allowed disabled:opacity-60',
  },
})
export class AuthSubmitComponent {
  readonly isLoading = input(false);
  readonly loadingLabel = input.required<string>();
  readonly disabled = input(false);
}
