// Screenshot the same routes in the Next.js app (:3000) and the Angular app (:4300)
// and report how many pixels differ.
//   NEXT_URL=http://localhost:3100  compare against another Next instance (e.g. a
//                                   production build with /api rewritten to :3001)
//   NG_URL=http://localhost:4400    compare the Angular production build
//                                   (tools/preview-dist.mjs) instead of ng serve
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const NEXT = process.env.NEXT_URL || 'http://localhost:3000';
const NG = process.env.NG_URL || 'http://localhost:4300';
const OUT = path.join(__dirname, 'compare');
fs.mkdirSync(OUT, { recursive: true });

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return env;
}

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const viewports = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1180, isMobile: true, hasTouch: true },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
};
const onlyViewports = args.find((a) => a.startsWith('--viewports='))?.slice(12).split(',');

const PUBLIC_ROUTES = [
  ['apply', '/apply'],
  ['status', '/status'],
  ['login', '/admin/login'],
  ['forgot', '/admin/forgot-password'],
  ['reset', '/admin/reset-password/0000000000000000000000000000000000000000000000000000000000000000'],
  ['endorse-bad', '/endorse/0000000000000000000000000000000000000000000000000000000000000000'],
  ['resume-bad', '/apply/resume/0000000000000000000000000000000000000000000000000000000000000000'],
  ['draft-bad', '/apply/some-draft-id'],
  ['notfound', '/this-page-does-not-exist'],
  ['admin-notfound', '/admin/nope'],
];
const ADMIN_ROUTES = [
  ['dashboard', '/admin/dashboard'],
  ['applications', '/admin/applications'],
  ['roster', '/admin/roster'],
  ['expiring', '/admin/expiring'],
  ['export', '/admin/export'],
  ['reports', '/admin/reports'],
  ['users', '/admin/users'],
  ['account', '/admin/account'],
];

const NO_CARET = `*{caret-color:transparent!important}`;

async function shoot(page, url, file, waitMs) {
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.addStyleTag({ content: NO_CARET });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await new Promise((r) => setTimeout(r, waitMs));
  await page.mouse.move(0, 0);
  await page.screenshot({ path: file, fullPage: true });
}

function diff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a));
  const B = PNG.sync.read(fs.readFileSync(b));
  const width = Math.max(A.width, B.width);
  const height = Math.max(A.height, B.height);
  const pad = (img) => {
    if (img.width === width && img.height === height) return img;
    const p = new PNG({ width, height });
    p.data.fill(255);
    PNG.bitblt(img, p, 0, 0, img.width, img.height, 0, 0);
    return p;
  };
  const pa = pad(A);
  const pb = pad(B);
  const d = new PNG({ width, height });
  const n = pixelmatch(pa.data, pb.data, d.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return { n, pct: (100 * n) / (width * height), sizeA: `${A.width}x${A.height}`, sizeB: `${B.width}x${B.height}` };
}

(async () => {
  // Credentials: ADMIN_EMAIL / ADMIN_PASSWORD from the environment (e.g. the parity
  // database's seed-dev admin), else from the repo's .env. Never printed.
  const env = { ...readEnv(path.join(__dirname, '../../../../.env')) };
  if (process.env.ADMIN_EMAIL) env.ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (process.env.ADMIN_PASSWORD) env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--hide-scrollbars', '--force-prefers-reduced-motion'],
  });
  const results = [];
  for (const [vpName, vp] of Object.entries(viewports)) {
    if (onlyViewports && !onlyViewports.includes(vpName)) continue;
    const page = await browser.newPage();
    await page.setViewport(vp);
    for (const [name, route] of PUBLIC_ROUTES) {
      if (only && !only.split(',').includes(name)) continue;
      const a = path.join(OUT, `${name}-${vpName}-next.png`);
      const b = path.join(OUT, `${name}-${vpName}-ng.png`);
      await shoot(page, NEXT + route, a, 1200);
      await shoot(page, NG + route, b, 1200);
      results.push({ vp: vpName, name, ...diff(a, b, path.join(OUT, `${name}-${vpName}-diff.png`)) });
    }

    // Sign in once (the session cookie is shared by both localhost ports).
    const wantAdmin = !only || ADMIN_ROUTES.some(([n]) => only.split(',').includes(n));
    if (wantAdmin && env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
      await page.goto(NEXT + '/admin/login', { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 1500));
      await page.type('input[type=email]', env.ADMIN_EMAIL);
      await page.type('input[type=password]', env.ADMIN_PASSWORD);
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }).catch(() => null), page.click('button[type=submit]')]);
      await new Promise((r) => setTimeout(r, 1500));
      const signedIn = page.url().includes('/admin/dashboard');
      results.push({ vp: vpName, name: 'login-flow', n: signedIn ? 0 : -1, pct: signedIn ? 0 : 100, sizeA: page.url(), sizeB: '' });
      for (const [name, route] of ADMIN_ROUTES) {
        if (only && !only.split(',').includes(name)) continue;
        const a = path.join(OUT, `${name}-${vpName}-next.png`);
        const b = path.join(OUT, `${name}-${vpName}-ng.png`);
        await shoot(page, NEXT + route, a, 2500);
        await shoot(page, NG + route, b, 2500);
        results.push({ vp: vpName, name, ...diff(a, b, path.join(OUT, `${name}-${vpName}-diff.png`)) });
      }
      // Start the next viewport signed out.
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
    }
    await page.close();
  }
  await browser.close();
  for (const r of results) {
    console.log(`${r.vp.padEnd(8)} ${r.name.padEnd(15)} diff=${r.pct.toFixed(2).padStart(6)}%  next=${r.sizeA}  ng=${r.sizeB}`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
