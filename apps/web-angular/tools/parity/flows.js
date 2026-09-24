// End-to-end parity flows. Runs the same scripted journeys against the Next.js
// reference and the Angular app, and for each app records:
//   - every /api call (method, normalised path, status, JSON body),
//   - console errors, page errors and CSP violations,
//   - full-page screenshots at named checkpoints (diffed Next vs Angular).
// Each flow runs on Next then on Angular before the next flow starts, so both
// apps see the same data at every checkpoint.
//
// Prerequisites (see CLAUDE.md → "Angular frontend"):
//   node stack.js reset && node stack.js up   isolated API :3002 + SMTP sink (mail/)
//   Next.js served with /api → :3002         NEXT_URL (default http://localhost:3100)
//   Angular served with /api → :3002         NG_URL   (default http://localhost:4400:
//                                            API=http://localhost:3002 node ../../tools/preview-dist.mjs)
//
//   node flows.js                   run every flow, in order
//   node flows.js apply status      run selected flows (see FLOWS below for names)
const puppeteer = require('puppeteer-core');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const APPS = {
  next: process.env.NEXT_URL || 'http://localhost:3100',
  ng: process.env.NG_URL || 'http://localhost:4400',
};
// Same glyphs in a different order: emails render at the same width and wrap identically.
const TAG = { next: '12', ng: '21' };
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'flows');
const MAIL_INDEX = path.join(__dirname, 'mail', 'index.jsonl');
const RUN = Date.now().toString(36).slice(-4);
// Seed-dev accounts in the parity database only (never the dev database).
const ADMIN = { email: 'admin@fafics.org', password: 'changeme123!' };
const RESET_OFFICER = 'colin.mittee@fafics.org';
const NEW_PASSWORD = 'Parity#Pass2026';
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Recording ────────────────────────────────────────────────────────────────
function normPath(url) {
  const u = new URL(url);
  return (u.pathname + u.search)
    .replace(new RegExp(`[.](${Object.values(TAG).join('|')})${RUN}(%40|@)`, 'g'), '.XX$2')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/[0-9a-f]{64}/gi, ':token')
    .replace(/EP-\d+/g, 'EP-n');
}

function normBody(text, app) {
  if (!text) return undefined;
  const normalised = text
    .replaceAll(`.${TAG[app]}${RUN}@`, '.XX@')
    .replace(/EP-\d+/g, 'EP-n')
    .replace(/[0-9a-f]{64}/g, ':token');
  try {
    return JSON.parse(normalised);
  } catch {
    return normalised.length > 200 ? normalised.slice(0, 200) + '…' : normalised;
  }
}

async function attach(page, app, rec) {
  // CSP violations are not console messages; collect them from the page itself.
  await page.exposeFunction('__parityCsp', (msg) => rec.errors.push(`CSP violation: ${msg}`));
  await page.evaluateOnNewDocument(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__parityCsp(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`),
    );
  });
  page.on('response', (res) => {
    const req = res.request();
    if (!/\/api\//.test(req.url()) || req.method() === 'OPTIONS') return;
    rec.api.push({ m: req.method(), p: normPath(req.url()), s: res.status(), body: normBody(req.postData(), app) });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') rec.errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => rec.errors.push(`pageerror: ${err.message}`));
  page.on('dialog', async (d) => {
    rec.errors.push(`dialog(${d.type()}): ${d.message()}`);
    await d.accept();
  });
}

// Records focus + scroll position (compared in the report), then captures the full
// page from the top so a sticky header's scroll offset can't skew the pixel diff.
async function shot(page, app, name, rec) {
  await page.mouse.move(0, 0);
  await sleep(900);
  rec.focus[name] = await page.evaluate(() => {
    const a = document.activeElement;
    const focus = a && a !== document.body ? `${a.tagName.toLowerCase()}${a.name ? `[name=${a.name}]` : ''}` : 'body';
    return `${focus} scrollY=${Math.round(scrollY)}`;
  });
  await page.addStyleTag({ content: '*{caret-color:transparent!important} html,body{scroll-behavior:auto!important}' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(OUT, `${name}-${app}.png`), fullPage: true });
  rec.shots.push(name);
}

// ── DOM helpers (the same selectors work in both apps — the Angular DOM mirrors React's) ─
async function byText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, t) => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim();
      return [...document.querySelectorAll(sel)].find((el) => norm(el.textContent).includes(t) && el.getClientRects().length) || null;
    },
    selector,
    text,
  );
  const el = handle.asElement();
  if (!el) throw new Error(`no visible ${selector} containing "${text}"`);
  return el;
}

const clickText = async (page, text, selector = 'button') => (await byText(page, selector, text)).click();

async function clickExact(page, text, selector = 'button') {
  // Last match first, so a modal's buttons win over identically named ones behind it.
  const handle = await page.evaluateHandle(
    (sel, t) =>
      [...document.querySelectorAll(sel)]
        .reverse()
        .find((el) => el.textContent.replace(/\s+/g, ' ').trim() === t && el.getClientRects().length) || null,
    selector,
    text,
  );
  const el = handle.asElement();
  if (!el) throw new Error(`no visible ${selector} with text exactly "${text}"`);
  await el.click();
}

// innerText applies CSS text-transform (uppercase labels), so compare case-insensitively.
async function waitText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (t) => document.body && document.body.innerText.toLowerCase().includes(t.toLowerCase()),
    { timeout },
    text,
  );
}

async function fieldRoot(page, label) {
  const handle = await page.evaluateHandle((t) => {
    const norm = (s) => s.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const l = [...document.querySelectorAll('label')].find((x) => norm(x.textContent).startsWith(t.toLowerCase()));
    return l ? l.parentElement : null;
  }, label);
  const el = handle.asElement();
  if (!el) throw new Error(`no field labelled "${label}"`);
  return el;
}

async function type(page, selector, text) {
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text);
}

// Native setter + input/change events: works for React's onChange and Angular's (input)/(change).
async function setValue(page, selector, value) {
  await page.$eval(
    selector,
    (el, v) => {
      const proto =
        el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    value,
  );
}

async function pickSearchable(page, label, query) {
  const root = await fieldRoot(page, label);
  await (await root.$('button[aria-haspopup="listbox"]')).click();
  await page.waitForSelector('input[placeholder="Search…"]', { visible: true });
  await page.type('input[placeholder="Search…"]', query);
  await sleep(100);
  await page.keyboard.press('Enter');
  await sleep(100);
}

async function pickPhone(page, label, country, number) {
  const root = await fieldRoot(page, label);
  await (await root.$('button[aria-haspopup="listbox"]')).click();
  await page.waitForSelector('input[placeholder="Search country or code…"]', { visible: true });
  await page.type('input[placeholder="Search country or code…"]', country);
  await sleep(100);
  await page.click('ul[role="listbox"] li[role="option"]');
  await sleep(100);
  await (await root.$('input[type="tel"]')).type(number);
}

function mails(address, since = 0) {
  if (!fs.existsSync(MAIL_INDEX)) return [];
  return fs
    .readFileSync(MAIL_INDEX, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((m) => m.to.some((t) => t.toLowerCase() === address.toLowerCase()) && Date.parse(m.at) >= since);
}

async function waitMailLink(address, pattern, since = 0, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const m of mails(address, since).reverse()) {
      const link = m.links.find((l) => pattern.test(l));
      if (link) return new URL(link);
    }
    await sleep(300);
  }
  throw new Error(`no mail to ${address} with a link matching ${pattern}`);
}

// Test fixture: run SQL against the parity database (stack.js sql).
function sql(statement) {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'stack.js'), 'sql'], { input: statement, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`sql failed: ${r.stderr || r.stdout}`);
}

async function login(page, base, email, password) {
  await page.goto(`${base}/admin/login`, { waitUntil: 'load' });
  await page.waitForSelector('input[type="email"]');
  await type(page, 'input[type="email"]', email);
  await type(page, 'input[type="password"]', password);
  await clickText(page, 'Sign In');
}

// ── Flows ────────────────────────────────────────────────────────────────────
const state = { next: {}, ng: {} };

async function fillStep1(page, email, president) {
  await type(page, '[name="personal.firstName"]', 'Maria');
  await type(page, '[name="personal.lastName"]', 'Tester');
  await setValue(page, '[name="personal.dateOfBirth"]', '1958-04-12');
  await pickSearchable(page, 'Nationality', 'Kenya');
  await page.select('[name="personal.gender"]', 'Female');
  await pickPhone(page, 'Phone Number', 'Kenya', '712345678');
  await type(page, '[name="personal.email"]', email);
  await setValue(page, '[name="personal.separationDate"]', '2018-06-30');
  await type(page, '[name="association.associationName"]', 'AFICS 12 Nairobi'); // digits are stripped as typed
  await pickSearchable(page, 'Country', 'Kenya');
  await type(page, '[name="association.presidentEmail"]', president);
}

async function fillStep2(page) {
  await type(page, '[name="educations.0.degreeName"]', 'MSc Economics');
  await type(page, '[name="educations.0.institution"]', 'University of Nairobi');
  await page.select('[name="languages.0.language"]', 'English');
  await page.select('[name="languages.0.proficiency"]', 'mother_tongue');
  await clickText(page, 'Add Language');
  await sleep(300);
  await page.select('[name="languages.1.language"]', 'French');
  await page.select('[name="languages.1.proficiency"]', 'proficient');
}

async function applyFlow(page, app, base, rec) {
  const email = `applicant.${TAG[app]}${RUN}@example.org`;
  const president = `president.${TAG[app]}${RUN}@example.org`;
  await page.goto(`${base}/apply`, { waitUntil: 'load' });
  await waitText(page, 'Personal Information');
  await shot(page, app, 'apply-01-step1', rec);

  await clickText(page, 'Next: Education & Languages');
  await shot(page, app, 'apply-02-step1-errors', rec);

  await fillStep1(page, email, email); // president email = applicant email → rejected
  await clickText(page, 'Next: Education & Languages');
  await shot(page, app, 'apply-03-step1-president-same', rec);

  await type(page, '[name="association.presidentEmail"]', president);
  await clickText(page, 'Next: Education & Languages');
  await page.waitForSelector('[name="educations.0.degreeName"]', { timeout: 15000 });
  await shot(page, app, 'apply-04-step2', rec);
  await sleep(6000); // let the 6 s "Progress saved" toast finish in both apps

  await clickText(page, 'Next: Work Experience');
  await shot(page, app, 'apply-05-step2-errors', rec);
  await fillStep2(page);
  await clickText(page, 'Add Qualification');
  await shot(page, app, 'apply-06-step2-filled', rec);
  await clickText(page, 'Next: Work Experience');
  await shot(page, app, 'apply-07-step2-row-errors', rec);
  // Remove the empty qualification row again.
  for (const b of (await page.$$('button')).reverse()) {
    const isRowRemove = await b.evaluate(
      (el) => el.textContent.trim() === '×' && !!el.closest('div')?.querySelector('[name="educations.1.institution"]'),
    );
    if (isRowRemove) {
      await b.click();
      break;
    }
  }
  await clickText(page, 'Next: Work Experience');
  await page.waitForSelector('[name="unExperiences.0.agency"]', { timeout: 15000 });
  await shot(page, app, 'apply-08-step3', rec);

  for (const [name, option] of [
    ['unExperiences.0.agency', 2],
    ['unExperiences.0.grade', 3],
    ['unExperiences.0.durationYears', 4],
  ]) {
    const value = await page.$eval(`[name="${name}"]`, (s, i) => s.options[i].value, option);
    await page.select(`[name="${name}"]`, value);
  }
  await type(page, '[name="unExperiences.0.positionTitle"]', 'Programme Officer');
  await type(page, '[name="unExperienceSummary"]', 'Led regional programmes.');
  await shot(page, app, 'apply-09-step3-filled', rec);
  await clickText(page, 'Next: Self Assessment');
  await page.waitForSelector('[name="expertise.0.expertiseLevel"]', { timeout: 15000 });
  await shot(page, app, 'apply-10-step4', rec);

  await page.click('[name="expertise.0.expertiseLevel"][value="expert"]');
  await page.click('[name="expertise.1.expertiseLevel"][value="advanced"]');
  await page.click('[name="expertise.2.expertiseLevel"][value="average"]');
  for (const i of [0, 1, 2]) await page.click(`[name="expertise.${i}.isPreferred"]`);
  await sleep(150); // Angular renders on the next frame; React re-renders synchronously on click
  rec.notes.push(`preferred #4 disabled after 3: ${await page.$eval('[name="expertise.3.isPreferred"]', (c) => c.disabled)}`);
  await clickText(page, 'Select your core strengths');
  await sleep(300);
  for (let i = 0; i < 5; i++) {
    const labels = await page.$$('div[style*="position: fixed"] label');
    await labels[i].click();
    await sleep(80);
  }
  await shot(page, app, 'apply-11-step4-competencies-open', rec);
  await page.mouse.click(5, 5);
  await sleep(200);
  await clickText(page, 'Next: Consent & Submit');
  await page.waitForSelector('[name="consentData"]', { timeout: 15000 });
  await shot(page, app, 'apply-12-step5', rec);

  await clickText(page, 'Submit Application');
  await shot(page, app, 'apply-13-step5-no-consent', rec);
  await page.click('[name="consentData"]');
  await page.click('[name="consentAccurate"]');
  await clickText(page, 'Submit Application');
  await waitText(page, 'Your Reference Number', 20000);
  await shot(page, app, 'apply-14-success', rec);
  state[app].reference = await page.evaluate(() => (document.body.innerText.match(/EP-\d+/) || [])[0]);
  state[app].email = email;
  state[app].president = president;
  rec.notes.push(`reference ${state[app].reference}`);
}

async function statusFlow(page, app, base, rec) {
  await page.goto(`${base}/status`, { waitUntil: 'load' });
  await waitText(page, 'Application Status');
  await shot(page, app, 'status-01', rec);
  const inputs = await page.$$('form input');
  const submit = async () => (await page.$$('form button[type="submit"]'))[0].click();
  await submit();
  await shot(page, app, 'status-02-errors', rec);
  await inputs[0].type(state[app].email);
  await inputs[1].type('EP-9999');
  await submit();
  await sleep(1500);
  await shot(page, app, 'status-03-not-found', rec);
  await type(page, 'form input[placeholder="e.g. EP-0042"]', state[app].reference);
  await submit();
  await sleep(1500);
  await shot(page, app, 'status-04-result', rec);
}

async function endorseFlow(page, app, base, rec) {
  const link = await waitMailLink(state[app].president, /\/endorse\/[0-9a-f]{64}/);
  await page.goto(`${base}${link.pathname}`, { waitUntil: 'load' });
  await waitText(page, 'Endorse Application');
  await shot(page, app, 'endorse-01-view', rec);
  await clickText(page, 'Return with Comments');
  await sleep(300);
  await clickExact(page, 'Return');
  await shot(page, app, 'endorse-02-return-needs-comments', rec);
  await clickExact(page, 'Cancel');
  await clickText(page, 'Endorse Application');
  await sleep(300);
  await page.type('textarea', 'Strong candidate.');
  await shot(page, app, 'endorse-03-confirm', rec);
  await clickExact(page, 'Endorse');
  await waitText(page, 'The applicant has been notified');
  await shot(page, app, 'endorse-04-done', rec);
  // Single-use link: opening it again shows the invalid-link page.
  await page.goto(`${base}${link.pathname}`, { waitUntil: 'load' });
  await waitText(page, 'Invalid or Expired');
  await shot(page, app, 'endorse-05-link-used', rec);
}

// A draft saved at step 3, reopened from the emailed resume link in a fresh browser.
async function resumeFlow(page, app, base, rec, browser) {
  const email = `resumer.${TAG[app]}${RUN}@example.org`;
  await page.goto(`${base}/apply`, { waitUntil: 'load' });
  await waitText(page, 'Personal Information');
  await fillStep1(page, email, `chair.${TAG[app]}${RUN}@example.org`);
  await clickText(page, 'Next: Education & Languages');
  await page.waitForSelector('[name="educations.0.degreeName"]', { timeout: 15000 });
  await fillStep2(page);
  await clickText(page, 'Next: Work Experience');
  await page.waitForSelector('[name="unExperiences.0.agency"]', { timeout: 15000 });
  await sleep(1500); // the forced save on navigation

  const link = await waitMailLink(email, /\/apply\/resume\/[0-9a-f]{64}/);
  const ctx = await browser.createBrowserContext();
  try {
    const fresh = await ctx.newPage();
    await fresh.setViewport({ width: 1280, height: 900 });
    await attach(fresh, app, rec);
    await fresh.goto(`${base}${link.pathname}`, { waitUntil: 'load' });
    await fresh.waitForFunction(() => [...document.querySelectorAll('h2')].some((h) => h.textContent.includes('Work Experience')), {
      timeout: 15000,
    });
    await sleep(1000);
    // Known difference: React's reset-after-mount effect wipes the auto-added
    // empty UN row (0 rows); the Angular form keeps it (1 row). See CLAUDE.md.
    rec.notes.push(`resumed step3 UN rows: ${await fresh.$$eval('[name$=".agency"]', (x) => x.length)}`);
    await shot(fresh, app, 'resume-01-restored-step3', rec);
    await clickText(fresh, 'Back');
    await fresh.waitForSelector('[name="educations.0.degreeName"]', { timeout: 15000 });
    await shot(fresh, app, 'resume-02-step2-values', rec);
    rec.notes.push(
      `resume step2: ${await fresh.$eval('[name="educations.0.degreeName"]', (i) => i.value)} / ${await fresh.$eval('[name="languages.1.language"]', (s) => s.value)}`,
    );
  } finally {
    await ctx.close();
  }

  // "Retrieve a saved draft" on the status page e-mails the resume link again.
  await page.goto(`${base}/status`, { waitUntil: 'load' });
  await waitText(page, 'Retrieve a saved draft');
  const forms = await page.$$('form');
  const draftForm = forms[forms.length - 1];
  await (await draftForm.$('button[type="submit"]')).click();
  await shot(page, app, 'resume-03-draft-link-errors', rec);
  const since = Date.now();
  await (await draftForm.$('input')).type(email);
  await (await draftForm.$('button[type="submit"]')).click();
  await sleep(1500);
  await shot(page, app, 'resume-04-draft-link-sent', rec);
  await waitMailLink(email, /\/apply\/resume\/[0-9a-f]{64}/, since);
  rec.notes.push('draft link re-sent');
}

// The 30-second debounced autosave (every other flow only triggers the forced
// saves on step navigation).
async function autosaveFlow(page, app, base, rec) {
  const email = `saver.${TAG[app]}${RUN}@example.org`;
  await page.goto(`${base}/apply`, { waitUntil: 'load' });
  await waitText(page, 'Personal Information');
  await fillStep1(page, email, `boss.${TAG[app]}${RUN}@example.org`);
  await clickText(page, 'Next: Education & Languages');
  await page.waitForSelector('[name="educations.0.degreeName"]', { timeout: 15000 });
  await sleep(1500);
  const before = rec.api.length;
  await type(page, '[name="educations.0.degreeName"]', 'PhD Statistics');
  await sleep(25000);
  rec.notes.push(`autosave after 25 s: ${rec.api.slice(before).filter((c) => c.m === 'PUT').length} PUT`);
  await page.waitForResponse((r) => r.request().method() === 'PUT' && /\/api\/applications\//.test(r.url()), { timeout: 15000 });
  await sleep(300);
  rec.notes.push(`autosave by 40 s: ${rec.api.slice(before).filter((c) => c.m === 'PUT').length} PUT`);
  await shot(page, app, 'autosave-01-saved-indicator', rec);
}

// Fill and submit a complete application without checkpoints.
async function submitApplication(page, base, email, president) {
  await page.goto(`${base}/apply`, { waitUntil: 'load' });
  await waitText(page, 'Personal Information');
  await fillStep1(page, email, president);
  await clickText(page, 'Next: Education & Languages');
  await page.waitForSelector('[name="educations.0.degreeName"]', { timeout: 15000 });
  await fillStep2(page);
  await clickText(page, 'Next: Work Experience');
  await page.waitForSelector('[name="unExperiences.0.agency"]', { timeout: 15000 });
  const agency = await page.$eval('[name="unExperiences.0.agency"]', (s) => s.options[1].value);
  await page.select('[name="unExperiences.0.agency"]', agency);
  await type(page, '[name="unExperiences.0.positionTitle"]', 'Senior Adviser');
  await clickText(page, 'Next: Self Assessment');
  await page.waitForSelector('[name="expertise.0.expertiseLevel"]', { timeout: 15000 });
  await page.click('[name="expertise.0.expertiseLevel"][value="advanced"]');
  await clickText(page, 'Next: Consent & Submit');
  await page.waitForSelector('[name="consentData"]', { timeout: 15000 });
  await page.click('[name="consentData"]');
  await page.click('[name="consentAccurate"]');
  await clickText(page, 'Submit Application');
  await waitText(page, 'Your Reference Number', 20000);
  return page.evaluate(() => (document.body.innerText.match(/EP-\d+/) || [])[0]);
}

// President returns the application → applicant revises from the e-mailed link → resubmits.
async function returnFlow(page, app, base, rec) {
  const email = `reviser.${TAG[app]}${RUN}@example.org`;
  const president = `head.${TAG[app]}${RUN}@example.org`;
  const reference = await submitApplication(page, base, email, president);
  const link = await waitMailLink(president, /\/endorse\/[0-9a-f]{64}/);
  await page.goto(`${base}${link.pathname}`, { waitUntil: 'load' });
  await waitText(page, 'Return with Comments');
  await clickText(page, 'Return with Comments');
  await sleep(300);
  await page.type('textarea', 'Please add your Non-UN experience.');
  const since = Date.now();
  await clickExact(page, 'Return');
  await waitText(page, 'The applicant has been notified with your comments');
  await shot(page, app, 'return-01-returned', rec);

  const edit = await waitMailLink(email, /\/apply\/resume\/[0-9a-f]{64}/, since);
  await page.goto(`${base}${edit.pathname}`, { waitUntil: 'load' });
  await waitText(page, "President's Feedback");
  await sleep(1000);
  await shot(page, app, 'return-02-revise-with-feedback', rec);
  // A complete returned application reopens on step 5, under the president's feedback.
  await page.waitForSelector('[name="consentData"]', { timeout: 15000 });
  if (!(await page.$eval('[name="consentData"]', (c) => c.checked))) await page.click('[name="consentData"]');
  if (!(await page.$eval('[name="consentAccurate"]', (c) => c.checked))) await page.click('[name="consentAccurate"]');
  await clickText(page, 'Submit Application');
  await waitText(page, 'Your Reference Number', 20000);
  await shot(page, app, 'return-04-resubmitted', rec);
  rec.notes.push(`returned+resubmitted ${reference}`);
}

// Read-only admin pages (screenshots taken before either app changes any data).
async function adminViewFlow(page, app, base, rec) {
  await login(page, base, ADMIN.email, 'wrong-password');
  await waitText(page, 'Invalid email or password');
  await shot(page, app, 'admin-01-login-error', rec);
  await type(page, 'input[type="password"]', ADMIN.password);
  await clickText(page, 'Sign In');
  await page.waitForFunction(() => location.pathname.endsWith('/admin/dashboard'), { timeout: 15000 });
  await sleep(2500);
  await shot(page, app, 'admin-02-dashboard', rec);

  await page.goto(`${base}/admin/applications`, { waitUntil: 'load' });
  await page.waitForSelector('input[placeholder="Search..."]');
  await sleep(1500);
  await shot(page, app, 'admin-03-applications', rec);
  await page.type('input[placeholder="Search..."]', state[app].reference);
  await sleep(1800);
  await shot(page, app, 'admin-04-applications-search', rec);
  await page.click('a[href*="/admin/applications/"]');
  await waitText(page, 'Audit Timeline');
  await sleep(1200);
  await shot(page, app, 'admin-05-detail', rec);

  await page.goto(`${base}/admin/roster`, { waitUntil: 'load' });
  await sleep(2000);
  await shot(page, app, 'admin-06-roster', rec);
  const cards = await page.$$('main button');
  if (cards.length) {
    await cards[0].click();
    await sleep(1200);
    await shot(page, app, 'admin-07-roster-profile', rec);
    await page.keyboard.press('Escape');
    await sleep(300);
  }

  await page.goto(`${base}/admin/users`, { waitUntil: 'load' });
  await waitText(page, 'Add New User');
  await sleep(800);
  await shot(page, app, 'admin-08-users', rec);
  await clickText(page, 'Add New User');
  await sleep(400);
  await shot(page, app, 'admin-09-users-add-modal', rec);

  await page.goto(`${base}/admin/account`, { waitUntil: 'load' });
  await page.waitForSelector('input[type="password"]');
  await sleep(800);
  await shot(page, app, 'admin-10-account', rec);
  const pw = await page.$$('input[type="password"]');
  await pw[0].type('whatever');
  await pw[1].type('Short1!');
  await pw[2].type('Different1!');
  await sleep(300);
  await shot(page, app, 'admin-11-account-invalid', rec);

  await page.goto(`${base}/admin/export`, { waitUntil: 'load' });
  await waitText(page, 'Download Expertise Pool');
  await sleep(800);
  await shot(page, app, 'admin-12-export', rec);
  const exported = page.waitForResponse((r) => /\/api\/admin\/export/.test(r.url()), { timeout: 30000 });
  await clickText(page, 'Download Expertise Pool');
  const res = await exported;
  rec.notes.push(`export: ${res.status()} ${res.headers()['content-type']} ${(await res.buffer()).length} bytes`);
  await sleep(1000);
  await shot(page, app, 'admin-13-export-done', rec);

  await page.goto(`${base}/admin/expiring`, { waitUntil: 'load' });
  await sleep(1500);
  await shot(page, app, 'admin-14-expiring', rec);

  await page.goto(`${base}/admin/reports`, { waitUntil: 'load' });
  await sleep(2500);
  await shot(page, app, 'admin-15-reports', rec);
}

// Officer actions on this run's application (put back to "endorsed" first, the
// only state in which Approve / Request changes / Reject are offered).
async function adminActionsFlow(page, app, base, rec) {
  sql(`UPDATE applications SET status = 'endorsed' WHERE reference_number = '${state[app].reference}';`);
  await page.goto(`${base}/admin/applications`, { waitUntil: 'load' });
  await page.waitForSelector('input[placeholder="Search..."]');
  await page.type('input[placeholder="Search..."]', state[app].reference);
  await sleep(1800);
  await page.click('a[href*="/admin/applications/"]');
  await waitText(page, 'Approve Application');
  await sleep(1000);
  await shot(page, app, 'action-01-endorsed-detail', rec);
  await clickText(page, 'Reject Application');
  await sleep(300);
  await clickExact(page, 'Reject');
  await shot(page, app, 'action-02-reject-needs-notes', rec);
  await clickExact(page, 'Cancel');
  await clickText(page, 'Add Internal Note');
  await sleep(300);
  await page.type('textarea', 'Checked references by phone.');
  await clickExact(page, 'Save Note');
  await sleep(1500);
  await clickText(page, 'Approve Application');
  await sleep(300);
  await page.type('textarea', 'Welcome to the pool.');
  await clickExact(page, 'Approve');
  await waitText(page, 'Active in Pool');
  await sleep(1500);
  await shot(page, app, 'action-03-approved', rec);

  await page.goto(`${base}/admin/users`, { waitUntil: 'load' });
  await waitText(page, 'Add New User');
  await clickText(page, 'Add New User');
  await sleep(400);
  const modalInputs = await page.$$('form input');
  rec.notes.push(`add-user inputs: ${modalInputs.length}`);
}

async function clickInRow(page, rowText, buttonText) {
  const handle = await page.evaluateHandle(
    (r, b) => {
      const row = [...document.querySelectorAll('tr')].find((tr) => tr.textContent.includes(r));
      return row ? [...row.querySelectorAll('button')].find((x) => x.textContent.trim() === b) || null : null;
    },
    rowText,
    buttonText,
  );
  const el = handle.asElement();
  if (!el) throw new Error(`no "${buttonText}" button in the row for ${rowText}`);
  await el.click();
}

// User management: create → edit → send reset → deactivate/reactivate → delete.
async function usersFlow(page, app, base, rec) {
  const email = `officer.${TAG[app]}${RUN}@example.org`;
  await login(page, base, ADMIN.email, ADMIN.password);
  await page.waitForFunction(() => location.pathname.endsWith('/admin/dashboard'), { timeout: 15000 });
  await page.goto(`${base}/admin/users`, { waitUntil: 'load' });
  await waitText(page, 'Add New User');
  await clickText(page, 'Add New User');
  await page.waitForSelector('form input[type="email"]');
  await (await page.$('form button[type="submit"]')).click();
  await sleep(500);
  await shot(page, app, 'users-01-create-errors', rec);
  await page.type('form input[type="email"]', email);
  const text = await page.$$('form input[type="text"]');
  await text[0].type('Olga');
  await text[1].type('Officer');
  await page.type('form input[type="password"]', 'Temp#Pass2026');
  await (await page.$('form button[type="submit"]')).click();
  await waitText(page, 'User created successfully.');
  await sleep(1200);

  await clickInRow(page, email, 'Edit');
  await page.waitForSelector('form input[type="email"]');
  const editText = await page.$$('form input[type="text"]');
  await editText[1].click({ clickCount: 3 });
  await editText[1].type('Officer-Updated');
  await (await page.$('form button[type="submit"]')).click();
  await waitText(page, 'User updated.');
  await sleep(1200);

  const since = Date.now();
  await clickInRow(page, email, 'Send Reset');
  await waitText(page, `Password reset link sent to ${email}.`);
  await waitMailLink(email, /\/admin\/reset-password\/[0-9a-f]{64}/, since);
  await sleep(1200);

  await clickInRow(page, email, 'Deactivate');
  await page.waitForFunction(
    (e) => [...document.querySelectorAll('tr')].some((tr) => tr.textContent.includes(e) && tr.textContent.includes('Reactivate')),
    { timeout: 15000 },
    email,
  );
  await clickInRow(page, email, 'Reactivate');
  await page.waitForFunction(
    (e) => [...document.querySelectorAll('tr')].some((tr) => tr.textContent.includes(e) && tr.textContent.includes('Deactivate')),
    { timeout: 15000 },
    email,
  );

  await clickInRow(page, email, 'Delete');
  await sleep(400);
  await shot(page, app, 'users-02-delete-confirm', rec);
  await page.type(`input[placeholder="${email}"]`, email);
  await clickExact(page, 'Delete Permanently');
  await waitText(page, `${email} deleted.`);
  await sleep(1500); // let the list refetch land before the next flow
  rec.notes.push('users: create/edit/reset/deactivate/reactivate/delete ok');
}

// Forgot password → emailed link → reset → sign in with the new password.
async function passwordFlow(page, app, base, rec) {
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies'); // start signed out
  await page.goto(`${base}/admin/forgot-password`, { waitUntil: 'load' });
  await page.waitForSelector('input[type="email"]');
  await shot(page, app, 'password-01-forgot', rec);
  const since = Date.now();
  await page.type('input[type="email"]', RESET_OFFICER);
  await (await page.$('button[type="submit"]')).click();
  await sleep(1500);
  await shot(page, app, 'password-02-forgot-sent', rec);
  const link = await waitMailLink(RESET_OFFICER, /\/admin\/reset-password\/[0-9a-f]{64}/, since);
  await page.goto(`${base}${link.pathname}`, { waitUntil: 'load' });
  await page.waitForSelector('input[type="password"]');
  await shot(page, app, 'password-03-reset-form', rec);
  const pw = await page.$$('input[type="password"]');
  await pw[0].type('weak');
  await pw[1].type('weak2');
  await sleep(300);
  await shot(page, app, 'password-04-reset-invalid', rec);
  await type(page, 'input[type="password"]', NEW_PASSWORD);
  const pw2 = await page.$$('input[type="password"]');
  await pw2[1].click({ clickCount: 3 });
  await pw2[1].type(NEW_PASSWORD);
  await (await page.$('button[type="submit"]')).click();
  await sleep(2000);
  await shot(page, app, 'password-05-reset-done', rec);
  await login(page, base, RESET_OFFICER, NEW_PASSWORD);
  await page.waitForFunction(() => location.pathname.endsWith('/admin/dashboard'), { timeout: 15000 });
  await sleep(2500);
  await shot(page, app, 'password-06-signed-in', rec);
  rec.notes.push('password reset → sign-in ok');
}

const FLOWS = {
  apply: applyFlow,
  status: statusFlow,
  endorse: endorseFlow,
  resume: resumeFlow,
  autosave: autosaveFlow,
  return: returnFlow,
  adminView: adminViewFlow,
  adminActions: adminActionsFlow,
  users: usersFlow,
  password: passwordFlow,
};

// ── Diff + report ────────────────────────────────────────────────────────────
function diff(name) {
  const a = PNG.sync.read(fs.readFileSync(path.join(OUT, `${name}-next.png`)));
  const b = PNG.sync.read(fs.readFileSync(path.join(OUT, `${name}-ng.png`)));
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const pad = (img) => {
    if (img.width === width && img.height === height) return img;
    const p = new PNG({ width, height });
    p.data.fill(255);
    PNG.bitblt(img, p, 0, 0, img.width, img.height, 0, 0);
    return p;
  };
  const d = new PNG({ width, height });
  const n = pixelmatch(pad(a).data, pad(b).data, d.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(path.join(OUT, `${name}-diff.png`), PNG.sync.write(d));
  return { pct: (100 * n) / (width * height), size: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
}

// Key order is irrelevant to the API, so compare bodies with sorted keys.
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

(async () => {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const flows = wanted.length ? wanted : Object.keys(FLOWS);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--hide-scrollbars', '--force-prefers-reduced-motion', '--lang=en-US'],
  });
  const pages = {};
  const recs = {};
  for (const app of Object.keys(APPS)) {
    const ctx = await browser.createBrowserContext();
    pages[app] = await ctx.newPage();
    await pages[app].setViewport({ width: 1280, height: 900 });
    recs[app] = { api: [], errors: [], shots: [], focus: {}, notes: [], failures: [] };
    await attach(pages[app], app, recs[app]);
  }
  for (const f of flows) {
    for (const app of Object.keys(APPS)) {
      const rec = recs[app];
      rec.api.push({ m: '##', p: f, s: '' });
      try {
        await FLOWS[f](pages[app], app, APPS[app], rec, browser);
      } catch (e) {
        rec.failures.push(`${f}: ${e.message.split('\n')[0]}`);
        await pages[app].screenshot({ path: path.join(OUT, `FAIL-${f}-${app}.png`), fullPage: true }).catch(() => {});
      }
    }
  }
  await browser.close();

  const report = [];
  for (const app of Object.keys(APPS)) {
    report.push(`\n=== ${app} (${APPS[app]})`);
    report.push(`failures: ${recs[app].failures.length ? recs[app].failures.join(' | ') : 'none'}`);
    report.push(`errors: ${recs[app].errors.length ? '\n  ' + recs[app].errors.join('\n  ') : 'none'}`);
    report.push(`notes: ${recs[app].notes.join(' | ')}`);
  }
  report.push('\n=== screenshots (Next vs Angular)');
  for (const n of recs.next.shots.filter((x) => recs.ng.shots.includes(x))) {
    const r = diff(n);
    const fa = recs.next.focus[n];
    const fb = recs.ng.focus[n];
    report.push(`${n.padEnd(36)} ${r.pct.toFixed(2).padStart(6)}%  ${r.size}${fa !== fb ? `  FOCUS/SCROLL next=${fa} ng=${fb}` : ''}`);
  }
  report.push('\n=== API calls per flow (≠ marks a difference; order within a flow is compared as a set)');
  const byFlow = (api) => {
    const out = {};
    let cur = '';
    for (const c of api) {
      if (c.m === '##') cur = c.p;
      else (out[cur] = out[cur] || []).push(c);
    }
    return out;
  };
  const A = byFlow(recs.next.api);
  const B = byFlow(recs.ng.api);
  for (const f of flows) {
    report.push(`-- ${f}`);
    const key = (c) => `${c.m} ${c.p} ${c.s} ${canonical(c.body)}`;
    const la = (A[f] || []).map(key).sort();
    const lb = (B[f] || []).map(key).sort();
    const onlyA = la.filter((k) => !lb.includes(k));
    const onlyB = lb.filter((k) => !la.includes(k));
    report.push(`   next ${la.length} calls, ng ${lb.length} calls${onlyA.length || onlyB.length ? '' : ' — identical'}`);
    for (const k of onlyA) report.push(`   ≠ next only: ${k.slice(0, 180)}`);
    for (const k of onlyB) report.push(`   ≠ ng only:   ${k.slice(0, 180)}`);
  }
  fs.writeFileSync(path.join(OUT, 'api-next.json'), JSON.stringify(recs.next.api, null, 2));
  fs.writeFileSync(path.join(OUT, 'api-ng.json'), JSON.stringify(recs.ng.api, null, 2));
  console.log(report.join('\n'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
