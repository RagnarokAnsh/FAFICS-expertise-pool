import { Directive, ElementRef, afterNextRender, booleanAttribute, inject, input } from '@angular/core';

/**
 * React's `autoFocus` prop: focus the element once it is mounted. (React calls
 * focus() itself rather than relying on the HTML autofocus attribute, which
 * browsers ignore for elements added after page load.)
 */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective {
  readonly enabled = input(true, { alias: 'appAutofocus', transform: booleanAttribute });

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      if (this.enabled()) {
        el.focus();
      }
    });
  }
}
