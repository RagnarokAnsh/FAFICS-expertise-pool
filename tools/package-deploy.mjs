#!/usr/bin/env node
/**
 * Builds the API and the Angular site and lays them out for upload to the
 * shared host (see DEPLOYMENT.md → Appendix E):
 *
 *   deploy/api/   → the cPanel Node.js app folder (behind https://api.fafics.com)
 *                   dist/  database/  scripts/  shared/  package.json  package-lock.json
 *   deploy/web/   → the contents of public_html (index.html, chunks, media, .htaccess)
 *
 * The API imports @fafics/shared, which is not on the npm registry, so a built
 * copy goes in deploy/api/shared and package.json points at it (file:./shared).
 *
 *   node tools/package-deploy.mjs              build + package
 *   node tools/package-deploy.mjs --no-build   package what is already built
 *
 * Never copies .env files. Upload deploy/api and deploy/web as described in
 * DEPLOYMENT.md, then run `npm run db:migrate` on the server.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'deploy');
const API = path.join(ROOT, 'apps/api');
const WEB = path.join(ROOT, 'apps/web-angular');
const SHARED = path.join(ROOT, 'packages/shared');

const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit' });
const copy = (from, to, filter) => fs.cpSync(from, to, { recursive: true, filter });
const noEnv = (src) => !/(^|[\\/])\.env(\.|$)/.test(path.basename(src)) || path.basename(src) === '.env.example';

if (!process.argv.includes('--no-build')) {
  run('npx turbo run build --filter=@fafics/api --filter=web-angular');
}
for (const p of [path.join(API, 'dist/main.js'), path.join(WEB, 'dist/index.html'), path.join(SHARED, 'dist/index.js')]) {
  if (!fs.existsSync(p)) throw new Error(`Missing ${path.relative(ROOT, p)}: build first (drop --no-build).`);
}

// The production bundle must point at the live API, not a local one.
const env = fs.readFileSync(path.join(WEB, 'src/environments/environment.ts'), 'utf8');
const apiUrl = (/apiUrl:\s*'([^']+)'/.exec(env) || [])[1];

fs.rmSync(OUT, { recursive: true, force: true });

// ── API ──────────────────────────────────────────────────────────────────────
const apiOut = path.join(OUT, 'api');
copy(path.join(API, 'dist'), path.join(apiOut, 'dist'), (s) => !s.endsWith('.tsbuildinfo'));
copy(path.join(API, 'database'), path.join(apiOut, 'database'));
// seed-dev wipes the database: it is for development machines only.
copy(path.join(API, 'scripts'), path.join(apiOut, 'scripts'), (s) => noEnv(s) && path.basename(s) !== 'seed-dev.ts');

const sharedPkg = JSON.parse(fs.readFileSync(path.join(SHARED, 'package.json'), 'utf8'));
fs.mkdirSync(path.join(apiOut, 'shared'), { recursive: true });
copy(path.join(SHARED, 'dist'), path.join(apiOut, 'shared/dist'), (s) => !s.endsWith('.tsbuildinfo'));
fs.writeFileSync(
  path.join(apiOut, 'shared/package.json'),
  JSON.stringify({ name: sharedPkg.name, version: sharedPkg.version, private: true, main: sharedPkg.main, types: sharedPkg.types, dependencies: sharedPkg.dependencies ?? {} }, null, 2) + '\n',
);

const apiPkg = JSON.parse(fs.readFileSync(path.join(API, 'package.json'), 'utf8'));
apiPkg.dependencies['@fafics/shared'] = 'file:./shared';
delete apiPkg.jest;
fs.writeFileSync(path.join(apiOut, 'package.json'), JSON.stringify(apiPkg, null, 2) + '\n');

// A lockfile for the server's `npm install`, resolved for this standalone folder.
try {
  run('npm install --package-lock-only --ignore-scripts --no-audit --no-fund --workspaces=false', apiOut);
} catch {
  console.warn('\n! Could not create deploy/api/package-lock.json (offline?). The server can install without it.\n');
}

// ── Website ──────────────────────────────────────────────────────────────────
copy(path.join(WEB, 'dist'), path.join(OUT, 'web'));

console.log(`
Packaged into ${path.relative(ROOT, OUT)}/
  api/  upload into the API's Node.js app folder (keep the server's .env)
  web/  upload its contents (including the hidden .htaccess) into public_html
The website calls: ${apiUrl ?? '(apiUrl not found in environment.ts)'}
Then on the server, in the API folder: npm install --omit=dev, npm run db:migrate, restart.
`);
