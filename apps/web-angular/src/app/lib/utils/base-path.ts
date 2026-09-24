/**
 * Prefix an app-internal path with the deployment base path so hard navigations
 * (window.location.href) keep working under a sub-path deploy (build with
 * `ng build --base-href /experts/`). The Angular router and routerLink are
 * base-href-aware automatically; raw window.location is not.
 */
export function withBasePath(path: string): string {
  const baseHref =
    (typeof document !== 'undefined' && document.querySelector('base')?.getAttribute('href')) || '/';
  return `${baseHref.replace(/\/+$/, '')}${path}`;
}
