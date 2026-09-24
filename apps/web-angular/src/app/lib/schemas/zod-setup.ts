import { config } from 'zod';

// zod's optional JIT probes `new Function('')` while it builds object schemas.
// The site's Content-Security-Policy (public/.htaccess) has no 'unsafe-eval', so
// that probe would log a CSP violation whenever the form loads. Validation
// results are identical without the JIT. This must run before any schema is
// created, which is why application.schema.ts imports this file first.
config({ jitless: true });
