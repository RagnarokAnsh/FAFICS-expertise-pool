import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import Cookies from 'js-cookie';
import { RoutePath } from '../../core/route-path.service';
import { adminApi } from '../../lib/api/admin.api';

const NAV_SECTIONS: {
  label: string;
  links: { href: string; label: string; icon: string; badge?: 'pending' }[];
}[] = [
  {
    label: 'Main',
    links: [
      { href: '/admin/dashboard', label: 'Overview', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
      {
        href: '/admin/applications',
        label: 'Applications',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        badge: 'pending',
      },
      {
        href: '/admin/roster',
        label: 'Expertise Pool',
        icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
      },
    ],
  },
  {
    label: 'Insights',
    links: [
      { href: '/admin/expiring', label: 'Expiring Profiles', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      // Hidden per client feedback — re-enable when ready
      // { href: '/admin/reports', label: 'Reports & Analytics', icon: 'M18 20V10M12 20V4M6 20v-6' },
      {
        href: '/admin/emails',
        label: 'Email Log',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      },
    ],
  },
];

const TITLES: { match: string; title: string }[] = [
  { match: '/admin/dashboard', title: 'Overview' },
  { match: '/admin/applications', title: 'Applications' },
  { match: '/admin/roster', title: 'Expertise Pool' },
  { match: '/admin/expiring', title: 'Expiring Profiles' },
  { match: '/admin/reports', title: 'Reports & Analytics' },
  { match: '/admin/users', title: 'User Management' },
  { match: '/admin/account', title: 'My Account' },
  { match: '/admin/emails', title: 'Email Log' },
];

// Hidden per client feedback — re-enable when ready (count badge next to sidebar items)
// PendingBadge: injectQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getStats, refetchInterval: 60000 }),
// then render `data?.pendingEndorsement ?? 0` as
// <span class="ml-auto rounded-[10px] bg-gold px-1.5 py-0.5 text-[10px] font-bold text-white">{{ count }}</span>
// (render nothing when the count is 0).

const LINK_BASE = 'mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors';
const LINK_ACTIVE = 'bg-gold/[0.18] text-gold';
const LINK_IDLE = 'text-white/55 hover:bg-white/[0.08] hover:text-white';

/** The Sidebar from app/admin/layout.tsx. */
@Component({
  selector: 'aside[appAdminSidebar]',
  imports: [RouterLink],
  template: `
    <div class="flex items-center gap-2.5 border-b border-white/10 px-5 py-[14px]">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center">
        <img
          alt="FAFICS"
          loading="lazy"
          width="36"
          height="36"
          decoding="async"
          class="h-full w-full object-contain"
          style="color: transparent"
          src="logo.png"
        />
      </div>
      <div>
        <div class="font-serif text-[14px] font-bold text-gold leading-none">FAFICS</div>
        <div class="mt-1 text-[10px] uppercase tracking-[0.06em] text-white/40">Officer Dashboard</div>
      </div>
    </div>

    <nav class="flex-1 px-3 py-4" (click)="navigated.emit()">
      @for (section of sections; track section.label) {
        <div>
          @for (link of section.links; track link.href) {
            <a [routerLink]="link.href" [class]="linkClass(pathname().startsWith(link.href))">
              <svg class="h-[15px] w-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="link.icon" />
              </svg>
              <span class="truncate">{{ link.label }}</span>
              <!-- Hidden per client feedback — re-enable when ready -->
              <!-- @if (link.badge === 'pending') { <app-pending-badge /> } -->
            </a>
          }
        </div>
      }
      <div>
        <a
          routerLink="/admin/account"
          [class]="linkClass(pathname().startsWith('/admin/account'))"
          (click)="navigated.emit()"
        >
          <svg class="h-[15px] w-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span class="truncate">My Account</span>
        </a>
      </div>
      @if (role() === 'admin') {
        <div>
          <a routerLink="/admin/users" [class]="linkClass(pathname().startsWith('/admin/users'))">
            <svg class="h-[15px] w-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
              />
            </svg>
            <span class="truncate">User Management</span>
          </a>
        </div>
      }
    </nav>

    <div class="border-t border-white/10 px-5 py-3.5">
      <div class="mb-2 text-[11.5px] capitalize text-white/40">Signed in as {{ role() ?? 'Officer' }}</div>
      <button (click)="logout.emit()" class="flex items-center gap-1.5 text-[12px] text-white/40 transition-colors hover:text-gold">
        <svg class="h-[13px] w-[13px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Sign Out
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-[236px] shrink-0 flex-col overflow-y-auto bg-navy lg:sticky lg:top-0 lg:h-screen' },
})
export class AdminSidebarComponent {
  readonly role = input<string | null>(null);
  readonly pathname = input.required<string>();
  readonly logout = output<void>();
  readonly navigated = output<void>();
  protected readonly sections = NAV_SECTIONS;

  protected linkClass(active: boolean): string {
    return `${LINK_BASE} ${active ? LINK_ACTIVE : LINK_IDLE}`;
  }
}

/**
 * app/admin/layout.tsx for the signed-in dashboard pages. (The password pages
 * and login render without this shell — see app.routes.ts — exactly like the
 * React layout's PUBLIC_ADMIN_ROUTES branch.)
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, AdminSidebarComponent],
  template: `
    @if (!isMounted()) {
      <div class="min-h-screen bg-off-white"></div>
    } @else {
      <div class="flex min-h-screen bg-off-white">
        <!-- Desktop sidebar (static) -->
        <div class="hidden lg:flex">
          <aside appAdminSidebar [role]="role()" [pathname]="pathname()" (logout)="handleLogout()"></aside>
        </div>

        <!-- Mobile drawer + backdrop -->
        <div [class]="'fixed inset-0 z-[120] lg:hidden ' + (mobileNavOpen() ? '' : 'pointer-events-none')">
          <div
            [class]="
              'absolute inset-0 bg-black/50 transition-opacity duration-200 ' + (mobileNavOpen() ? 'opacity-100' : 'opacity-0')
            "
            (click)="mobileNavOpen.set(false)"
          ></div>
          <div
            [class]="
              'absolute left-0 top-0 h-full transition-transform duration-200 ' +
              (mobileNavOpen() ? 'translate-x-0' : '-translate-x-full')
            "
          >
            <aside
              appAdminSidebar
              [role]="role()"
              [pathname]="pathname()"
              (logout)="handleLogout()"
              (navigated)="mobileNavOpen.set(false)"
            ></aside>
          </div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col">
          <header class="sticky top-0 z-40 flex h-[62px] items-center gap-3 border-b border-border bg-white px-4 sm:px-6">
            <button
              type="button"
              (click)="mobileNavOpen.set(true)"
              aria-label="Open navigation menu"
              class="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy transition-colors hover:bg-off-white lg:hidden"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 class="truncate font-serif text-[19px] font-bold text-navy sm:text-[24px]">{{ title() }}</h1>
          </header>
          <main class="flex-1 overflow-auto"><router-outlet /></main>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AdminLayout {
  private readonly router = inject(Router);
  protected readonly pathname = inject(RoutePath).pathname;
  protected readonly isMounted = signal(false);
  protected readonly role = signal<string | null>(null);
  protected readonly mobileNavOpen = signal(false);

  protected readonly title = computed(
    () => TITLES.find((t) => this.pathname().startsWith(t.match))?.title ?? 'Dashboard',
  );

  constructor() {
    effect(() => {
      this.pathname();
      untracked(() => {
        // Close the mobile drawer whenever the route changes.
        this.mobileNavOpen.set(false);

        // The JWT is an HttpOnly cookie JS can't read; gate the UI on the readable
        // role hint instead. The API still enforces auth on every request, and a
        // 401 from an expired session redirects here via the admin API interceptor.
        const userRole = Cookies.get('fafics_role');
        if (!userRole) {
          this.router.navigateByUrl('/admin/login');
        } else {
          this.role.set(userRole || null);
          this.isMounted.set(true);
        }
      });
    });
  }

  protected async handleLogout(): Promise<void> {
    try {
      await adminApi.logout();
    } catch {
      // Ignore network errors — we clear the client state and redirect regardless.
    }
    Cookies.remove('fafics_role');
    this.router.navigateByUrl('/admin/login');
  }
}
