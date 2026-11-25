import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

/** Unknown URLs: a page in the site's style with a way back to the main pages. */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <div class="min-h-[60vh] flex items-center justify-center bg-off-white px-4 py-16">
      <div class="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
        <p class="font-mono text-[13px] text-text-light mb-2">404</p>
        <h1 class="text-2xl font-serif font-bold text-navy mb-2">Page not found</h1>
        <p class="text-text-mid mb-6">The page you are looking for does not exist or has moved.</p>
        <div class="flex flex-col gap-3">
          <a
            routerLink="/apply"
            class="inline-flex h-[44px] items-center justify-center rounded-lg bg-navy px-5 text-[14px] font-semibold text-white transition-colors hover:bg-navy-mid"
            >Go to the application form</a
          >
          <a
            routerLink="/status"
            class="inline-flex h-[44px] items-center justify-center rounded-lg border border-border px-5 text-[14px] font-semibold text-navy transition-colors hover:bg-navy-light"
            >Check application status</a
          >
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class NotFoundPage {
  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);
    const previousTitle = title.getTitle();
    title.setTitle('Page not found — FAFICS Expertise Pool');
    const robots = meta.addTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => {
      title.setTitle(previousTitle);
      if (robots) meta.removeTagElement(robots);
    });
  }
}
