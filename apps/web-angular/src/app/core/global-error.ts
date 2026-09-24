import { ErrorHandler, Injectable, inject, signal } from '@angular/core';

/** Holds the error that brought down rendering, if any (Next.js global-error). */
@Injectable({ providedIn: 'root' })
export class GlobalErrorState {
  readonly error = signal<unknown>(null);

  reset(): void {
    this.error.set(null);
  }
}

/**
 * Errors thrown while Angular renders (the ones a React error boundary would
 * catch) are logged and switch the app to the global error screen, matching
 * app/global-error.tsx in the Next.js app.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly state = inject(GlobalErrorState);

  handleError(error: unknown): void {
    console.error(error);
    this.state.error.set(error);
  }
}
