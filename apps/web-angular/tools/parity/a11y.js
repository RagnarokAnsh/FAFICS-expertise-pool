// Accessibility audit (axe-core) of the same routes in the Next.js app and the
// Angular app. Identical results are expected, since the markup is the same; the
// report lists every rule violated, so it doubles as a UI audit of the approved
// design. Admin pages need ADMIN_EMAIL / ADMIN_PASSWORD (env, else the repo .env).
//
//   NEXT_URL=http://localhost:3100 NG_URL=http://localhost:4400 node a11y.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APPS = {
  next: process.env.NEXT_URL || 'http://localhost:3000',
  ng: process.env.NG_URL || 'http://localhost:4300',
};
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ROUTES = ['/apply', '/status', '/admin/login', '/admin/forgot-password', '/this-page-does-not-exist'];
const ADMIN_ROUTES = ['/admin/dashboard', '/admin/applications', '/admin/roster', '/admin/expiring', '/admin/export', '/admin/users', '/admin/account'];

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return env;
}

async function audit(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(AXE);
  const result = await page.evaluate(() =>
    window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }),
  );
  return result.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, help: v.help, sample: v.nodes[0]?.target?.join(' ') }));
}

(async () => {
  const fileEnv = readEnv(path.join(__dirname, '../../../../.env'));
  const email = process.env.ADMIN_EMAIL || fileEnv.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD || fileEnv.ADMIN_PASSWORD;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = {};
  for (const [app, base] of Object.entries(APPS)) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    results[app] = {};
    for (const r of ROUTES) results[app][r] = await audit(page, base + r);
    if (email && password) {
      await page.goto(`${base}/admin/login`, { waitUntil: 'load' });
      await page.waitForSelector('input[type=email]');
      await page.type('input[type=email]', email);
      await page.type('input[type=password]', password);
      await page.click('button[type=submit]');
      await page.waitForFunction(() => location.pathname.endsWith('/admin/dashboard'), { timeout: 15000 });
      for (const r of ADMIN_ROUTES) results[app][r] = await audit(page, base + r);
    }
    await ctx.close();
  }
  await browser.close();

  const key = (v) => `${v.id} x${v.count}`;
  for (const route of Object.keys(results.next)) {
    const a = results.next[route].map(key).sort().join(', ');
    const b = (results.ng[route] || []).map(key).sort().join(', ');
    console.log(`${route}\n  ${a === b ? 'same in both' : `DIFFERENT\n  next: ${a}\n  ng:   ${b}`}`);
    for (const v of results.ng[route] || []) console.log(`   [${v.impact}] ${v.id} ×${v.count} — ${v.help}  (e.g. ${v.sample})`);
  }
  fs.writeFileSync(path.join(__dirname, 'a11y-report.json'), JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
