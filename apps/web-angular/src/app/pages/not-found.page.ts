import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/**
 * The Next.js built-in 404 page, reproduced markup-for-markup (including its
 * body colour override and document title) so unknown URLs look the same.
 */
@Component({
  selector: 'app-not-found-page',
  template: `
    <div
      style="font-family: system-ui, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;; height: 100vh; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center"
    >
      <div>
        <h1
          class="next-error-h1"
          style="display: inline-block; margin: 0 20px 0 0; padding: 0 23px 0 0; font-size: 24px; font-weight: 500; vertical-align: top; line-height: 49px"
        >404</h1>
        <div style="display: inline-block">
          <h2 style="font-size: 14px; font-weight: 400; line-height: 49px; margin: 0">This page could not be found.</h2>
        </div>
      </div>
    </div>
  `,
  styles: `
    body {
      color: #000;
      background: #fff;
      margin: 0;
    }
    .next-error-h1 {
      border-right: 1px solid rgba(0, 0, 0, 0.3);
    }
    @media (prefers-color-scheme: dark) {
      body {
        color: #fff;
        background: #000;
      }
      .next-error-h1 {
        border-right: 1px solid rgba(255, 255, 255, 0.3);
      }
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class NotFoundPage {
  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);
    const previousTitle = title.getTitle();
    title.setTitle('404: This page could not be found.');
    const robots = meta.addTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => {
      title.setTitle(previousTitle);
      if (robots) meta.removeTagElement(robots);
    });
  }
}
