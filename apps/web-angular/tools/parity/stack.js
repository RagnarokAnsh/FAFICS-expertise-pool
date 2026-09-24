// Isolated backend for the end-to-end parity flows (flows.js). It never touches
// the development database and never sends real email:
//   - database  fafics_parity: same server and credentials as DATABASE_URL in
//               apps/api/.env, different database name
//   - API       apps/api/dist started on :3002 against fafics_parity, with the
//               rate limiter disabled (the flows make many requests)
//   - SMTP      a local sink on :2525. Every message is saved to ./mail/, and
//               the links in it are appended to ./mail/index.jsonl
//
//   node stack.js reset   (re)create fafics_parity: migrations + seed + dev seed
//   node stack.js up      run the SMTP sink and the API until Ctrl+C
//
// Build the API first (npm run build in apps/api) so dist/ is current.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const API_DIR = path.join(ROOT, 'apps/api');
const PARITY_DB = 'fafics_parity';
const API_PORT = 3002;
const SMTP_PORT = 2525;
const MAIL_DIR = path.join(__dirname, 'mail');

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return env;
}

// Same precedence as the API's ConfigModule: apps/api/.env wins over the root .env.
const fileEnv = { ...readEnv(path.join(ROOT, '.env')), ...readEnv(path.join(API_DIR, '.env')) };
if (!fileEnv.DATABASE_URL) throw new Error('DATABASE_URL not found in apps/api/.env or .env');
const devDb = new URL(fileEnv.DATABASE_URL);
const parityDb = new URL(fileEnv.DATABASE_URL);
parityDb.pathname = `/${PARITY_DB}`;
if (devDb.pathname === parityDb.pathname) throw new Error('Refusing to run: the dev database is already named ' + PARITY_DB);

const env = {
  ...process.env,
  ...fileEnv,
  NODE_ENV: 'development',
  DATABASE_URL: parityDb.toString(),
  API_PORT: String(API_PORT),
  API_BASE_URL: `http://localhost:${API_PORT}`,
  WEB_BASE_URL: 'http://localhost:4400',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: String(SMTP_PORT),
  SMTP_USER: 'parity',
  SMTP_PASS: 'parity',
  FROM_EMAIL: 'FAFICS Parity <noreply@example.org>',
  SECRETARY_EMAIL: 'secretary@example.org',
};
delete env.RESEND_API_KEY; // unset → the API uses the SMTP sink

function assertParity(e) {
  if (!e.DATABASE_URL.endsWith(`/${PARITY_DB}`)) throw new Error('DATABASE_URL is not the parity database');
}

// Runs a CLI from the root node_modules (no shell, so JSON arguments survive on Windows).
function run(bin, args) {
  assertParity(env);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', bin), ...args], {
    cwd: API_DIR,
    env,
    stdio: 'inherit',
  });
  if (r.status !== 0) throw new Error(`${bin} ${args.join(' ')} failed`);
}

function reset() {
  // --skip-generate: the Prisma client is already generated, and regenerating it
  // while the dev API runs fails on Windows (the engine DLL is locked).
  run('prisma/build/index.js', ['migrate', 'reset', '--force', '--skip-seed', '--skip-generate']);
  run('ts-node/dist/bin.js', ['--compiler-options', '{"module":"CommonJS"}', 'prisma/seed.ts']);
  run('ts-node/dist/bin.js', ['--transpile-only', 'prisma/seed-dev.ts']);
}

// ── SMTP sink ────────────────────────────────────────────────────────────────
function decodeQuotedPrintable(s) {
  return s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function decodeHeader(v) {
  return v.replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi, (_, enc, text) =>
    enc.toUpperCase() === 'B'
      ? Buffer.from(text, 'base64').toString('utf8')
      : Buffer.from(decodeQuotedPrintable(text.replace(/_/g, ' ')), 'latin1').toString('utf8'),
  );
}

// Just enough MIME to read what nodemailer sends: multipart bodies, base64 or
// quoted-printable parts, RFC 2047 encoded headers (folded lines unfolded).
function parseMime(raw) {
  const split = raw.search(/\r?\n\r?\n/);
  const head = (split < 0 ? raw : raw.slice(0, split)).replace(/\r?\n[ \t]+/g, ' ');
  const body = split < 0 ? '' : raw.slice(split).replace(/^\r?\n\r?\n/, '');
  const header = (name) => (new RegExp(`^${name}:\\s*(.*)$`, 'im').exec(head) || [])[1] || '';
  const type = header('Content-Type');
  const boundary = (/boundary="?([^";]+)"?/i.exec(type) || [])[1];
  if (/^multipart\//i.test(type) && boundary) {
    const parts = body.split(`--${boundary}`).slice(1).filter((p) => !p.startsWith('--'));
    return { header, text: parts.map((p) => parseMime(p.replace(/^\r?\n/, '')).text).join('\n') };
  }
  const encoding = header('Content-Transfer-Encoding').toLowerCase();
  const text =
    encoding === 'base64'
      ? Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8')
      : encoding === 'quoted-printable'
        ? Buffer.from(decodeQuotedPrintable(body), 'latin1').toString('utf8')
        : body;
  return { header, text };
}

function indexMail(n, raw, rcpt, at) {
  const mime = parseMime(raw);
  const subject = decodeHeader(mime.header('Subject'));
  const links = [...new Set((mime.text.match(/https?:\/\/[^\s"'<>]+/g) || []).map((l) => l.replace(/&amp;/g, '&')))];
  return { n, to: rcpt, subject, links, at };
}

function saveMail(raw, rcpt) {
  fs.mkdirSync(MAIL_DIR, { recursive: true });
  const n = fs.readdirSync(MAIL_DIR).filter((f) => f.endsWith('.eml')).length + 1;
  fs.writeFileSync(path.join(MAIL_DIR, `${String(n).padStart(4, '0')}.eml`), raw);
  const entry = indexMail(n, raw, rcpt, new Date().toISOString());
  fs.appendFileSync(path.join(MAIL_DIR, 'index.jsonl'), JSON.stringify(entry) + '\n');
  console.log(`[smtp] #${n} to=${rcpt.join(',')} subject=${entry.subject}`);
}

function startSmtpSink() {
  net
    .createServer((sock) => {
      sock.setEncoding('utf8');
      sock.write('220 parity-sink ESMTP\r\n');
      let buf = '';
      let inData = false;
      let data = '';
      let rcpt = [];
      sock.on('data', (chunk) => {
        buf += chunk;
        let i;
        while ((i = buf.indexOf('\r\n')) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 2);
          if (inData) {
            if (line === '.') {
              inData = false;
              saveMail(data, rcpt);
              data = '';
              rcpt = [];
              sock.write('250 OK\r\n');
            } else {
              data += (line.startsWith('..') ? line.slice(1) : line) + '\r\n';
            }
            continue;
          }
          const verb = line.slice(0, 4).toUpperCase();
          if (verb === 'EHLO') sock.write('250-parity-sink\r\n250 8BITMIME\r\n');
          else if (verb === 'RCPT') {
            rcpt.push(line.replace(/^RCPT TO:\s*/i, '').replace(/[<>]/g, ''));
            sock.write('250 OK\r\n');
          } else if (verb === 'DATA') {
            inData = true;
            sock.write('354 End data with <CR><LF>.<CR><LF>\r\n');
          } else if (verb === 'QUIT') {
            sock.write('221 Bye\r\n');
            sock.end();
          } else sock.write('250 OK\r\n');
        }
      });
      sock.on('error', () => {});
    })
    .listen(SMTP_PORT, '127.0.0.1', () => console.log(`[smtp] sink on 127.0.0.1:${SMTP_PORT} → ${MAIL_DIR}`));
}

function up() {
  assertParity(env);
  startSmtpSink();
  const api = spawn(process.execPath, ['-r', path.join(__dirname, 'no-throttle.js'), path.join(API_DIR, 'dist/main.js')], {
    // A cwd without a .env, so ConfigModule sees only the variables above.
    cwd: __dirname,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const log = fs.createWriteStream(path.join(__dirname, 'api.log'));
  api.stdout.pipe(log);
  api.stderr.pipe(log);
  api.on('exit', (code) => {
    console.log(`[api] exited with ${code} — see api.log`);
    process.exit(code || 0);
  });
  console.log(`[api] http://localhost:${API_PORT}/api (database ${PARITY_DB}, log → api.log)`);
}

// Rebuild mail/index.jsonl from the saved .eml files (after a parser change).
function reindex() {
  const files = fs.readdirSync(MAIL_DIR).filter((f) => f.endsWith('.eml')).sort();
  const old = fs.readFileSync(path.join(MAIL_DIR, 'index.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const lines = files.map((f, i) => {
    const prev = old[i] || { to: [], at: '' };
    return JSON.stringify(indexMail(i + 1, fs.readFileSync(path.join(MAIL_DIR, f), 'utf8'), prev.to, prev.at));
  });
  fs.writeFileSync(path.join(MAIL_DIR, 'index.jsonl'), lines.join('\n') + '\n');
  console.log(`re-indexed ${lines.length} messages`);
}

// Test fixtures: run SQL (from stdin) against fafics_parity via `prisma db execute`.
function sql() {
  assertParity(env);
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'],
    { cwd: API_DIR, env, input: fs.readFileSync(0, 'utf8'), stdio: ['pipe', 'inherit', 'inherit'] },
  );
  process.exit(r.status);
}

const cmd = process.argv[2];
if (cmd === 'check') run('prisma/build/index.js', ['migrate', 'status']); // read-only: shows which database is targeted
else if (cmd === 'reset') reset();
else if (cmd === 'up') up();
else if (cmd === 'reindex') reindex();
else if (cmd === 'sql') sql();
else console.log('usage: node stack.js check | reset | up | reindex | sql < statements.sql');
