import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';
import {
  PasswordChecklistComponent,
  PasswordFieldComponent,
  isPasswordValid,
} from '../../components/admin/password-field';
import { ButtonComponent } from '../../components/ui/button';
import { ToastService } from '../../core/toast.service';
import { adminApi, authApi } from '../../lib/api/admin.api';
import { ROLE_OPTIONS, roleLabel } from '../../lib/auth/roles';
import { formatDate } from '../../lib/utils/date';
import { isValidEmail } from '../../lib/utils/email';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
}

/** Pulls a readable message out of a NestJS error, which may be a string or an array. */
function apiMessage(err: any, fallback: string): string {
  const raw = err?.response?.data?.message;
  if (Array.isArray(raw)) return raw.join('\n');
  return raw || fallback;
}

const INPUT_CLASS = 'w-full border border-border rounded p-2 text-sm';
const LABEL_CLASS = 'block text-[11px] text-text-light font-medium uppercase mb-1';
function roleDescription(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.description ?? '';
}

const ACTION_BUTTON =
  'inline-flex h-[26px] items-center justify-center rounded border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40';

// ─── Modals ──────────────────────────────────────────────────────────────────

/** ModalShell */
@Component({
  selector: 'app-user-modal-shell',
  template: `
    <div class="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-serif font-bold text-navy mb-4">{{ heading() }}</h3>
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class UserModalShellComponent {
  readonly heading = input.required<string>();
}

/** CreateUserModal */
@Component({
  selector: 'app-create-user-modal',
  imports: [UserModalShellComponent, PasswordFieldComponent, PasswordChecklistComponent, ButtonComponent],
  template: `
    <app-user-modal-shell heading="Create New User">
      <form (submit)="handleSubmit($event)" novalidate>
        @if (error()) {
          <div class="mb-4 text-danger text-sm whitespace-pre-line">{{ error() }}</div>
        }

        <div class="mb-4">
          <label [class]="labelClass">Email <span class="text-gold ml-0.5">*</span></label>
          <input type="email" [value]="email()" (input)="email.set($any($event.target).value)" [class]="inputClass" />
        </div>

        <div class="flex gap-4 mb-4">
          <div class="flex-1">
            <label [class]="labelClass">First Name <span class="text-gold ml-0.5">*</span></label>
            <input type="text" [value]="firstName()" (input)="firstName.set($any($event.target).value)" [class]="inputClass" />
          </div>
          <div class="flex-1">
            <label [class]="labelClass">Last Name <span class="text-gold ml-0.5">*</span></label>
            <input type="text" [value]="lastName()" (input)="lastName.set($any($event.target).value)" [class]="inputClass" />
          </div>
        </div>

        <div class="mb-4">
          <label [class]="labelClass">Role <span class="text-gold ml-0.5">*</span></label>
          <select (change)="role.set($any($event.target).value)" [class]="inputClass">
            @for (r of roles; track r.value) {
              <option [value]="r.value" [selected]="r.value === role()">{{ r.label }}</option>
            }
          </select>
          <p class="mt-1.5 text-[11.5px] text-text-light">{{ roleDescription(role()) }}</p>
        </div>

        <div class="mb-6">
          <div
            appPasswordField
            label="Temporary Password *"
            [value]="password()"
            (valueChange)="password.set($event)"
            autoComplete="new-password"
          ></div>
          <app-password-checklist [value]="password()" />
          <p class="mt-2 text-[11.5px] text-text-light">
            Share this with the new user, or create the account and use “Reset Password” to email them a link instead.
          </p>
        </div>

        <div class="flex justify-end gap-3">
          <button appButton variant="ghost" type="button" (click)="closed.emit()">Cancel</button>
          <button appButton type="submit" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Creating...' : 'Create User' }}</button>
        </div>
      </form>
    </app-user-modal-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class CreateUserModalComponent {
  readonly closed = output<void>();
  readonly created = output<void>();
  private readonly toast = inject(ToastService);
  protected readonly inputClass = INPUT_CLASS;
  protected readonly labelClass = LABEL_CLASS;
  protected readonly email = signal('');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly password = signal('');
  // Least privilege by default: a new account is view-only until an admin
  // deliberately picks a stronger role.
  protected readonly role = signal<string>('management');
  protected readonly roles = ROLE_OPTIONS;
  protected readonly roleDescription = roleDescription;
  protected readonly error = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const email = this.email();
    const firstName = this.firstName();
    const lastName = this.lastName();
    const password = this.password();
    if (!email.trim() || !firstName.trim() || !lastName.trim() || !password) {
      this.error.set('Please fill in all required fields.');
      return;
    }
    if (!isValidEmail(email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid(password)) {
      this.error.set('The password must meet all four requirements below.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      await adminApi.createUser({
        email: email.trim(),
        password,
        role: this.role(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      this.toast.showToast('User created successfully.', 'success');
      this.created.emit();
    } catch (err: any) {
      const msg = apiMessage(err, 'Failed to create user.');
      this.error.set(msg);
      this.toast.showToast(msg.split('\n')[0], 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

/** EditUserModal */
@Component({
  selector: 'app-edit-user-modal',
  imports: [UserModalShellComponent, ButtonComponent],
  template: `
    <app-user-modal-shell heading="Edit User">
      <form (submit)="handleSubmit($event)" novalidate>
        @if (error()) {
          <div class="mb-4 text-danger text-sm whitespace-pre-line">{{ error() }}</div>
        }

        <div class="mb-4">
          <label [class]="labelClass">Email <span class="text-gold ml-0.5">*</span></label>
          <input type="email" [value]="email()" (input)="email.set($any($event.target).value)" [class]="inputClass" />
        </div>

        <div class="flex gap-4 mb-4">
          <div class="flex-1">
            <label [class]="labelClass">First Name <span class="text-gold ml-0.5">*</span></label>
            <input type="text" [value]="firstName()" (input)="firstName.set($any($event.target).value)" [class]="inputClass" />
          </div>
          <div class="flex-1">
            <label [class]="labelClass">Last Name <span class="text-gold ml-0.5">*</span></label>
            <input type="text" [value]="lastName()" (input)="lastName.set($any($event.target).value)" [class]="inputClass" />
          </div>
        </div>

        <div class="mb-4">
          <label [class]="labelClass">Role</label>
          <select (change)="role.set($any($event.target).value)" [disabled]="isSelf()" [class]="inputClass">
            @for (r of roles(); track r.value) {
              <option [value]="r.value" [selected]="r.value === role()">{{ r.label }}</option>
            }
          </select>
          <p class="mt-1.5 text-[11.5px] text-text-light">
            @if (isSelf()) {
              You cannot change your own role.
            } @else {
              {{ roleDescription(role()) }}
            }
          </p>
        </div>

        <p class="mb-6 rounded bg-gray-50 p-3 text-[12px] text-text-mid">
          Passwords cannot be set from here. Use <strong>Reset Password</strong> on the user list to email this person a link
          so they can choose their own.
        </p>

        <div class="flex justify-end gap-3">
          <button appButton variant="ghost" type="button" (click)="closed.emit()">Cancel</button>
          <button appButton type="submit" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Saving...' : 'Save Changes' }}</button>
        </div>
      </form>
    </app-user-modal-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EditUserModalComponent implements OnInit {
  readonly user = input.required<AdminUser>();
  readonly isSelf = input(false);
  readonly closed = output<void>();
  readonly saved = output<void>();
  private readonly toast = inject(ToastService);
  protected readonly inputClass = INPUT_CLASS;
  protected readonly labelClass = LABEL_CLASS;
  protected readonly email = signal('');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly role = signal('');
  protected readonly roles = computed(() => {
    const current = this.user().role;
    return ROLE_OPTIONS.some((r) => r.value === current)
      ? ROLE_OPTIONS
      : [...ROLE_OPTIONS, { value: current, label: `${roleLabel(current)} (current)`, description: '' }];
  });
  protected readonly roleDescription = roleDescription;
  protected readonly error = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  ngOnInit(): void {
    this.email.set(this.user().email);
    this.firstName.set(this.user().firstName);
    this.lastName.set(this.user().lastName);
    this.role.set(this.user().role);
  }

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const email = this.email();
    const firstName = this.firstName();
    const lastName = this.lastName();
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      this.error.set('Please fill in all fields.');
      return;
    }
    if (!isValidEmail(email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      await adminApi.updateUser(this.user().id, {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        // Only sent when changed, so saving a name never touches the role.
        ...(this.role() !== this.user().role ? { role: this.role() } : {}),
      });
      this.toast.showToast('User updated.', 'success');
      this.saved.emit();
    } catch (err: any) {
      const msg = apiMessage(err, 'Failed to update user.');
      this.error.set(msg);
      this.toast.showToast(msg.split('\n')[0], 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

/** DeleteUserDialog */
@Component({
  selector: 'app-delete-user-dialog',
  imports: [UserModalShellComponent, ButtonComponent],
  template: `
    <app-user-modal-shell heading="Delete User">
      <p class="mb-4 text-[14px] text-text">
        This permanently removes <strong class="text-navy">{{ user().email }}</strong>. Their entries in the audit trail are
        kept, but the account cannot be restored.
      </p>
      <p class="mb-4 rounded border border-gold/30 bg-gold/5 p-3 text-[12.5px] text-text-mid">
        Prefer <strong>Deactivate</strong> if you only need to block sign-in — it is reversible and keeps every record
        attached to the account.
      </p>

      <div class="mb-6">
        <label [class]="labelClass">Type the email address to confirm</label>
        <input
          type="text"
          [value]="confirmText()"
          (input)="confirmText.set($any($event.target).value)"
          [placeholder]="user().email"
          autocomplete="off"
          [class]="inputClass"
        />
      </div>

      <div class="flex justify-end gap-3">
        <button appButton variant="ghost" type="button" (click)="cancelled.emit()">Cancel</button>
        <button
          type="button"
          (click)="confirmed.emit()"
          [disabled]="!canDelete() || isDeleting()"
          class="rounded-lg bg-danger px-5 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ isDeleting() ? 'Deleting...' : 'Delete Permanently' }}
        </button>
      </div>
    </app-user-modal-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DeleteUserDialogComponent {
  readonly user = input.required<AdminUser>();
  readonly isDeleting = input(false);
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();
  protected readonly inputClass = INPUT_CLASS;
  protected readonly labelClass = LABEL_CLASS;
  protected readonly confirmText = signal('');
  protected readonly canDelete = computed(
    () => this.confirmText().trim().toLowerCase() === this.user().email.toLowerCase(),
  );
}

/** app/admin/users/page.tsx */
@Component({
  selector: 'app-users-page',
  imports: [NgTemplateOutlet, ButtonComponent, CreateUserModalComponent, EditUserModalComponent, DeleteUserDialogComponent],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <div class="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p class="text-text-mid">
            Manage who can sign in to the dashboard and what they can do. Management accounts can view and export, but
            cannot change anything.
          </p>
        </div>
        <button appButton class="shrink-0 whitespace-nowrap" (click)="isCreateOpen.set(true)">+ Add New User</button>
      </div>

      <div class="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        @if (usersQ.isLoading()) {
          <div class="p-8 text-center text-text-light">Loading users...</div>
        } @else {
          <!-- Shared by the table (wider screens) and the card list (phones). -->
          <ng-template #statusBadge let-user>
        <span
          [class]="
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ' +
            (user.isActive ? 'bg-success/10 text-success' : 'bg-text-muted/15 text-text-light')
          "
        >
          <span [class]="'h-1.5 w-1.5 rounded-full ' + (user.isActive ? 'bg-success' : 'bg-text-muted')"></span
          >{{ user.isActive ? 'Active' : 'Inactive' }}
        </span>
          </ng-template>
          <ng-template #roleBadge let-user>
        <span
          [class]="
            'inline-flex whitespace-nowrap rounded px-2 py-0.5 text-[11.5px] font-semibold ' +
            (user.role === 'admin' ? 'bg-navy text-white' : 'bg-navy/10 text-navy')
          "
          >{{ roleLabel(user.role) }}</span
        >
          </ng-template>
          <ng-template #userActions let-user let-isSelf="isSelf" let-busy="busy">
        <button
          (click)="editing.set(user)"
          [disabled]="busy"
          [class]="actionButton + ' border-border text-navy hover:enabled:bg-navy hover:enabled:text-white'"
        >
          Edit
        </button>
        <button
          (click)="handleSendReset(user)"
          [disabled]="busy || !user.isActive"
          [attr.title]="
            user.isActive ? 'Email this user a link to set a new password' : 'Reactivate the account first'
          "
          [class]="actionButton + ' border-border text-navy hover:enabled:bg-navy hover:enabled:text-white'"
        >
          Send Reset
        </button>
        <button
          (click)="handleToggleActive(user)"
          [disabled]="busy || isSelf"
          [attr.title]="isSelf ? 'You cannot deactivate your own account' : null"
          [class]="
            actionButton + ' border-border text-text-mid hover:enabled:bg-text-mid hover:enabled:text-white'
          "
        >
          {{ user.isActive ? 'Deactivate' : 'Reactivate' }}
        </button>
        <button
          (click)="deleting.set(user)"
          [disabled]="busy || isSelf"
          [attr.title]="isSelf ? 'You cannot delete your own account' : null"
          [class]="
            actionButton + ' border-danger/30 text-danger hover:enabled:bg-danger hover:enabled:text-white'
          "
        >
          Delete
        </button>
          </ng-template>

          <div class="hidden md:block overflow-x-auto">
            <table class="w-full min-w-[1000px] text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 border-b border-border">
                  <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Name</th>
                  <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Email</th>
                  <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Role</th>
                  <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Status</th>
                  <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase whitespace-nowrap">Last Sign-In</th>
                  <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase">Created</th>
                  <th class="py-3 px-4 text-[12px] font-semibold text-navy uppercase text-right w-px whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of usersQ.data() ?? []; track user.id) {
                  @let isSelf = meQ.data()?.userId === user.id;
                  @let busy = busyId() === user.id;
                  <tr class="border-b border-border last:border-0 hover:bg-gray-50">
                    <td class="py-3 px-4 text-[14px] text-navy font-medium">
                      {{ displayName(user) }}@if (isSelf) {<span
                          class="ml-2 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-navy"
                          >You</span
                        >}
                    </td>
                    <td class="py-3 px-4 text-[14px] text-text-mid">{{ user.email }}</td>
                    <td class="py-3 px-4">
                      <ng-container *ngTemplateOutlet="roleBadge; context: { $implicit: user }" />
                    </td>
                    <td class="py-3 px-4">
                      <ng-container *ngTemplateOutlet="statusBadge; context: { $implicit: user }" />
                    </td>
                    <td class="py-3 px-4 text-[14px] text-text-light whitespace-nowrap">
                      {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}
                    </td>
                    <td class="py-3 px-4 text-[14px] text-text-light whitespace-nowrap">{{ formatDate(user.createdAt) }}</td>
                    <td class="py-3 px-4 w-px whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        <ng-container *ngTemplateOutlet="userActions; context: { $implicit: user, isSelf: isSelf, busy: busy }" />
                      </div>
                    </td>
                  </tr>
                }
                @if (usersQ.data()?.length === 0) {
                  <tr>
                    <td colspan="7" class="py-8 text-center text-text-light">No users yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Phones: one card per user, with every action visible. -->
          <ul class="md:hidden divide-y divide-border">
            @for (user of usersQ.data() ?? []; track user.id) {
              @let isSelf = meQ.data()?.userId === user.id;
              @let busy = busyId() === user.id;
              <li class="p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-[14px] text-navy font-medium">
                      {{ displayName(user) }}@if (isSelf) {<span
                          class="ml-2 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-navy"
                          >You</span
                        >}
                    </p>
                    <p class="text-[13px] text-text-mid [overflow-wrap:anywhere]">{{ user.email }}</p>
                    <p class="mt-1.5">
                      <ng-container *ngTemplateOutlet="roleBadge; context: { $implicit: user }" />
                    </p>
                    <p class="mt-1 text-[12px] text-text-light">
                      Last sign-in: {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}
                    </p>
                  </div>
                  <ng-container *ngTemplateOutlet="statusBadge; context: { $implicit: user }" />
                </div>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  <ng-container *ngTemplateOutlet="userActions; context: { $implicit: user, isSelf: isSelf, busy: busy }" />
                </div>
              </li>
            }
            @if (usersQ.data()?.length === 0) {
              <li class="py-8 text-center text-text-light">No users yet.</li>
            }
          </ul>
        }
      </div>

      @if (isCreateOpen()) {
        <app-create-user-modal (closed)="isCreateOpen.set(false)" (created)="onCreated()" />
      }

      @if (editing(); as user) {
        <app-edit-user-modal
          [user]="user"
          [isSelf]="meQ.data()?.userId === user.id"
          (closed)="editing.set(null)"
          (saved)="onSaved()"
        />
      }

      @if (deleting(); as user) {
        <app-delete-user-dialog
          [user]="user"
          [isDeleting]="busyId() === user.id"
          (cancelled)="deleting.set(null)"
          (confirmed)="handleDelete()"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class UsersPage {
  private readonly queryClient = inject(QueryClient);
  private readonly toast = inject(ToastService);
  protected readonly formatDate = formatDate;
  protected readonly roleLabel = roleLabel;
  protected readonly actionButton = ACTION_BUTTON;

  protected readonly isCreateOpen = signal(false);
  protected readonly editing = signal<AdminUser | null>(null);
  protected readonly deleting = signal<AdminUser | null>(null);
  /** Id of the row with an action in flight, so only that row's buttons disable. */
  protected readonly busyId = signal<string | null>(null);

  protected readonly usersQ = injectQuery<AdminUser[]>(() => ({
    queryKey: ['admin-users'],
    queryFn: adminApi.listUsers,
  }));

  // Used to stop an admin from deleting or deactivating themselves in the UI.
  // The API enforces the same rules; this just avoids offering a dead button.
  protected readonly meQ = injectQuery(() => ({ queryKey: ['auth-me'], queryFn: authApi.me }));

  private refresh(): void {
    this.queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  protected displayName(user: AdminUser): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
  }

  protected async handleSendReset(user: AdminUser): Promise<void> {
    this.busyId.set(user.id);
    try {
      await adminApi.sendUserPasswordReset(user.id);
      this.toast.showToast(`Password reset link sent to ${user.email}.`, 'success');
    } catch (err: any) {
      this.toast.showToast(apiMessage(err, 'Failed to send the reset link.'), 'error');
    } finally {
      this.busyId.set(null);
    }
  }

  protected async handleToggleActive(user: AdminUser): Promise<void> {
    this.busyId.set(user.id);
    try {
      await adminApi.updateUser(user.id, { isActive: !user.isActive });
      this.toast.showToast(
        user.isActive ? `${user.email} deactivated — they can no longer sign in.` : `${user.email} reactivated.`,
        'success',
      );
      this.refresh();
    } catch (err: any) {
      this.toast.showToast(apiMessage(err, 'Failed to update the account.'), 'error');
    } finally {
      this.busyId.set(null);
    }
  }

  protected async handleDelete(): Promise<void> {
    const deleting = this.deleting();
    if (!deleting) return;
    this.busyId.set(deleting.id);
    try {
      await adminApi.deleteUser(deleting.id);
      this.toast.showToast(`${deleting.email} deleted.`, 'success');
      this.deleting.set(null);
      this.refresh();
    } catch (err: any) {
      this.toast.showToast(apiMessage(err, 'Failed to delete the account.'), 'error');
    } finally {
      this.busyId.set(null);
    }
  }

  protected onCreated(): void {
    this.isCreateOpen.set(false);
    this.refresh();
  }

  protected onSaved(): void {
    this.editing.set(null);
    this.refresh();
  }
}
