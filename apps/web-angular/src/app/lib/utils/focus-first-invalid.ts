/** Toast shown when "Next" finds problems on the current step. */
export const STEP_ERROR_MESSAGE = 'Please complete the fields highlighted in red.';

/**
 * After a failed "Next", bring the first field with an error into view and
 * focus it, so the applicant lands on the problem instead of staying by the
 * button. Waits a moment for the error state to render. Fields mark themselves
 * with aria-invalid; blocks without a single field use data-form-error.
 */
export function focusFirstInvalid(root: ParentNode = document): void {
  setTimeout(() => {
    const el = root.querySelector<HTMLElement>('[aria-invalid="true"], [data-form-error]');
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.focus({ preventScroll: true });
  }, 50);
}
