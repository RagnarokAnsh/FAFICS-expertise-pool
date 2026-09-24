import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** The current pathname as a signal — the equivalent of Next.js usePathname(). */
@Injectable({ providedIn: 'root' })
export class RoutePath {
  private readonly router = inject(Router);

  readonly pathname = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => stripQuery(e.urlAfterRedirects)),
    ),
    { initialValue: stripQuery(this.router.url) },
  );
}

function stripQuery(url: string): string {
  return url.split(/[?#]/)[0] || '/';
}
