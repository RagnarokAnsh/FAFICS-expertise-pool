/**
 * Prefix an app-internal path with the build-time basePath so hard navigations
 * (window.location.href) keep working under a sub-path deploy (see
 * NEXT_PUBLIC_BASE_PATH in next.config.mjs). Next's <Link> and router are
 * basePath-aware automatically; raw window.location is not.
 */
export function withBasePath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`;
}
