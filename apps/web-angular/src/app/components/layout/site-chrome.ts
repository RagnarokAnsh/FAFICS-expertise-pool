import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RoutePath } from '../../core/route-path.service';

const NAV_LINKS = [
  { href: '/apply', label: 'Apply' },
  { href: '/status', label: 'Check Status' },
];

/**
 * Public site header + footer — components/layout/SiteChrome.tsx. The admin
 * section has its own shell (sidebar + topbar), so this chrome is hidden on
 * /admin routes to avoid a duplicate FAFICS header. The page itself is
 * projected once; on /admin its wrapper is `display: contents`, so the admin
 * shell lays out exactly as it does when the React component returns children
 * unwrapped.
 */
@Component({
  selector: 'app-site-chrome',
  imports: [RouterLink],
  template: `
    @if (!isAdmin()) {
      <header class="bg-navy sticky top-0 z-[100] shadow-[0_2px_20px_rgba(0,0,0,0.25)]">
        <div class="max-w-[1020px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <a routerLink="/" class="flex items-center gap-3.5 shrink-0">
            <div class="w-[46px] h-[46px] flex items-center justify-center shrink-0">
              <img
                alt="FAFICS"
                fetchpriority="high"
                width="46"
                height="46"
                decoding="async"
                class="w-full h-full object-contain"
                style="color: transparent"
                src="logo.png"
              />
            </div>
            <div class="text-[11px] text-white/55 tracking-[0.05em] uppercase hidden md:block max-w-[280px] leading-snug">
              Federation of Associations of Former International Civil Servants
            </div>
          </a>

          <nav class="flex items-center gap-1 sm:gap-2">
            @for (link of navLinks; track link.href) {
              <a
                [routerLink]="link.href"
                [attr.aria-current]="isActive(link.href) ? 'page' : null"
                [class]="
                  'relative px-2.5 sm:px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ' +
                  (isActive(link.href)
                    ? 'text-gold font-semibold after:absolute after:left-2.5 after:right-2.5 after:bottom-0 after:h-[2px] after:rounded-full after:bg-gold'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.08]')
                "
                >{{ link.label }}</a
              >
            }
            <a
              routerLink="/admin/login"
              [attr.aria-current]="isOfficerActive() ? 'page' : null"
              [class]="
                'ml-1 sm:ml-2 px-3 py-1.5 text-[12px] font-medium border rounded-full transition-colors whitespace-nowrap ' +
                (isOfficerActive()
                  ? 'text-navy bg-gold border-gold font-semibold'
                  : 'text-gold/90 border-gold/35 hover:bg-gold/10')
              "
              >Officer Login</a
            >
          </nav>
        </div>
      </header>
    }

    <div [class]="isAdmin() ? 'contents' : 'flex-1 flex flex-col'">
      <ng-content />
    </div>

    @if (!isAdmin()) {
      <footer class="bg-navy px-8 py-[18px] text-center mt-10 mt-auto">
        <p class="text-[12px] text-white/40">© {{ year }} FAFICS. All rights reserved.<span class="mx-2 text-white/20">·</span><a routerLink="/admin/login" class="text-white/40 hover:text-white/70 transition-colors">Officer Login</a></p>
      </footer>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SiteChromeComponent {
  private readonly pathname = inject(RoutePath).pathname;
  protected readonly navLinks = NAV_LINKS;
  protected readonly year = new Date().getFullYear();

  protected readonly isAdmin = computed(() => this.pathname().startsWith('/admin'));
  protected readonly isOfficerActive = computed(() => this.pathname().startsWith('/admin'));

  // "/" counts as the Apply tab; each other tab matches its route prefix.
  protected isActive(href: string): boolean {
    const pathname = this.pathname();
    return href === '/apply' ? pathname === '/' || pathname.startsWith('/apply') : pathname.startsWith(href);
  }
}
