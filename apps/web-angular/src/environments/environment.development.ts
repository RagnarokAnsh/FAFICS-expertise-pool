/**
 * Used by `ng serve` (the "development" build configuration, see angular.json
 * fileReplacements). `/api` is forwarded by proxy.conf.json to the local API,
 * so a local session never talks to the production API that environment.ts
 * points at.
 */
export const environment = {
  apiUrl: '/api',
};
