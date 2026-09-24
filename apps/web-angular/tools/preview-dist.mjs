// Serve the production build (dist/) the way the shared host will, for a final
// local check before uploading:
//   - app routes fall back to index.html (like the RewriteRules in .htaccess)
//   - /api/* is proxied to the local NestJS API (like the Node.js app at /api)
//   - every `Header always set` / `Header set Cache-Control` line from
//     dist/.htaccess is applied, so the Content-Security-Policy is exercised
//
// Usage (from apps/web-angular):  npm run build && node tools/preview-dist.mjs
// Env: PORT (default 4400), API (default http://localhost:3001)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT || 4400);
const api = new URL(process.env.API || 'http://localhost:3001');

const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
const always = [...htaccess.matchAll(/^\s*Header always set (\S+) "(.*)"\s*$/gm)].map((m) => [m[1], m[2]]);
const cacheRules = [...htaccess.matchAll(/<FilesMatch "(.+?)">\s*Header set Cache-Control "(.+?)"/g)].map((m) => [
  new RegExp(m[1]),
  m[2],
]);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, file) {
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' };
  for (const [name, value] of always) headers[name] = value;
  const base = path.basename(file);
  for (const [re, value] of cacheRules) if (re.test(base)) headers['Cache-Control'] = value;
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const upstream = http.request(
        { hostname: api.hostname, port: api.port, path: req.url, method: req.method, headers: req.headers },
        (r) => {
          res.writeHead(r.statusCode, r.headers);
          r.pipe(res);
        },
      );
      upstream.on('error', () => {
        res.writeHead(502);
        res.end('API unreachable');
      });
      req.pipe(upstream);
      return;
    }
    const file = path.join(root, decodeURIComponent(url.pathname));
    if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res, file);
    sendFile(res, path.join(root, 'index.html'));
  })
  .listen(port, () => console.log(`dist/ preview on http://localhost:${port} (API → ${api.origin})`));
