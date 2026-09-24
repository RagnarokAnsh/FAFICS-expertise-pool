import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalErrorState } from './core/global-error';
import { SiteChromeComponent } from './components/layout/site-chrome';
import { ToastHostComponent } from './components/ui/toast';

/**
 * Root component — app/layout.tsx. The toast outlet renders into
 * #toast-container (in index.html) and the global error screen replaces the
 * page when rendering fails, as app/global-error.tsx does.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteChromeComponent, ToastHostComponent],
  template: `
    @if (globalError.error()) {
      <div style="padding: 2rem; text-align: center">
        <h2>Something went wrong!</h2>
        <button (click)="globalError.reset()" style="margin-top: 1rem; padding: 0.5rem 1rem">Try again</button>
      </div>
    } @else {
      <app-site-chrome>
        <router-outlet />
      </app-site-chrome>
      <app-toast-host />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class App {
  protected readonly globalError = inject(GlobalErrorState);
}
