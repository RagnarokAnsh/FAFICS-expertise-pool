import { DestroyRef, Directive, ElementRef, OnInit, inject, input } from '@angular/core';

/**
 * Moves its host element to another place in the document — the Angular
 * stand-in for React's createPortal. With no value (or 'body') the element is
 * appended to <body>; otherwise to the first element matching the selector.
 * If the selector matches nothing, the element is removed, just as the React
 * Toast renders nothing when #toast-container is missing.
 */
@Directive({ selector: '[appPortal]' })
export class PortalDirective implements OnInit {
  readonly target = input<string>('', { alias: 'appPortal' });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.el.remove());
  }

  ngOnInit(): void {
    const selector = this.target();
    const container = !selector || selector === 'body' ? document.body : document.querySelector(selector);
    if (container) {
      container.appendChild(this.el);
    } else {
      this.el.remove();
    }
  }
}
