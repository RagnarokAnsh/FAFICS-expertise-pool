/**
 * Loads the FAFICS records from a plain-text PostgreSQL dump (pg_dump — e.g. the
 * export of the previous Supabase database) into this database.
 *
 *   npm run db:import -- path/to/dump.sql              import
 *   npm run db:import -- path/to/dump.sql --dry-run    check only, change nothing
 *   npm run db:import -- path/to/dump.sql --replace-existing-data [--dry-run]
 *       first DELETES every FAFICS record already in this database (for a
 *       database holding only test data), then imports — in the same
 *       transaction, so a failure leaves the old data in place.
 *
 * - Reads only the FAFICS tables: users, associations, applications and their
 *   details, links (magic_tokens), audit and email logs. Everything else in the
 *   dump — Supabase's auth/storage schemas, Prisma's _prisma_migrations — is
 *   ignored.
 * - Run `npm run db:migrate` first: the schema must be current.
 * - All-or-nothing: one transaction. Rows whose id is already present are
 *   skipped, so running it twice changes nothing.
 * - Refuses, before changing anything, when a record would clash with a
 *   DIFFERENT existing one (same email, reference number, association or link).
 * - Afterwards the reference-number / UID counters continue after the highest
 *   imported number.
 *
 * Uses DATABASE_URL from the environment (or .env). The dump contains personal
 * data: keep it out of the code zip and delete it once imported.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv is optional — DATABASE_URL may come from the real environment.
}

// Load order satisfies the foreign keys. associations.president_user_id points
// at users, which load later, so it is filled in a second pass.
const TABLES = [
  'associations',
  'users',
  'applications',
  'application_educations',
  'application_languages',
  'application_un_experiences',
  'application_nonun_experiences',
  'application_fafics_experiences',
  'application_local_experiences',
  'application_expertise',
  'magic_tokens',
  'audit_logs',
  'notification_logs',
];
const SECOND_PASS = { associations: ['president_user_id'] };
const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');
const END_OF_DATA = '\\.'; // pg_dump ends each COPY block with a backslash and a dot

/** Decodes one field of PostgreSQL's COPY text format. */
function decodeField(raw) {
  if (raw === '\\N') return null;
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\\') {
      out += c;
      continue;
    }
    const n = raw[++i];
    if (n === 'b') out += '\b';
    else if (n === 'f') out += '\f';
    else if (n === 'n') out += '\n';
    else if (n === 'r') out += '\r';
    else if (n === 't') out += '\t';
    else if (n === 'v') out += '\v';
    else if (n === 'x' && /[0-9a-fA-F]/.test(raw[i + 1] || '')) {
      let hex = raw[++i];
      if (/[0-9a-fA-F]/.test(raw[i + 1] || '')) hex += raw[++i];
      out += String.fromCharCode(parseInt(hex, 16));
    } else if (/[0-7]/.test(n)) {
      let oct = n;
      while (oct.length < 3 && /[0-7]/.test(raw[i + 1] || '')) oct += raw[++i];
      out += String.fromCharCode(parseInt(oct, 8));
    } else out += n;
  }
  return out;
}

/** The FAFICS COPY blocks of a pg_dump file: { table: { columns, rows } }. */
function readDump(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const tables = {};
  for (let i = 0; i < lines.length; i++) {
    // Only the public schema (Supabase's auth.users etc. are different tables).
    const m = /^COPY public\.([a-z_]+) \(([^)]*)\) FROM stdin;$/.exec(lines[i]);
    if (!m) continue;
    const columns = m[2].split(', ').map((c) => c.replace(/^"|"$/g, ''));
    const rows = [];
    let j = i + 1;
    for (; j < lines.length && lines[j] !== END_OF_DATA; j++) {
      const values = lines[j].split('\t').map(decodeField);
      if (values.length !== columns.length) {
        throw new Error(`${m[1]}: a row has ${values.length} fields, expected ${columns.length}`);
      }
      rows.push(Object.fromEntries(columns.map((c, k) => [c, values[k]])));
    }
    if (TABLES.includes(m[1])) tables[m[1]] = { columns, rows };
    i = j;
  }
  return tables;
}

function mask(email) {
  const [local, domain] = String(email).split('@');
  return `${local.slice(0, 2)}…@${domain ?? ''}`;
}

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');
  const replace = process.argv.includes('--replace-existing-data');
  if (!file) {
    console.error('Usage: npm run db:import -- <path to dump.sql> [--replace-existing-data] [--dry-run]');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const src = readDump(file);
  const missing = TABLES.filter((t) => !src[t]);
  if (missing.length === TABLES.length) {
    console.error('No FAFICS tables found in that file. Is it a plain-text pg_dump of the FAFICS database?');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // The schema must be current, or rows would not fit.
    const expected = fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_.+\.sql$/.test(f));
    const { rows: tracking } = await client.query("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS ok");
    const applied = tracking[0].ok
      ? new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
      : new Set();
    const pending = expected.filter((f) => !applied.has(f));
    if (pending.length) {
      console.error(`Run "npm run db:migrate" first — pending: ${pending.join(', ')}`);
      process.exit(1);
    }

    // Columns: every column in the dump must exist here (none may be lost).
    const columnsOf = {};
    for (const table of Object.keys(src)) {
      const { rows } = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
        [table],
      );
      const target = new Set(rows.map((r) => r.column_name));
      const lost = src[table].columns.filter((c) => !target.has(c));
      if (lost.length) {
        console.error(`${table}: this database has no column(s) ${lost.join(', ')} — the dump is from a newer schema.`);
        process.exit(1);
      }
      columnsOf[table] = src[table].columns;
    }

    // Clashes with DIFFERENT existing records would violate unique rules.
    // (Not relevant with --replace-existing-data: those records are deleted.)
    const clashes = [];
    const check = async (label, sql, params, show) => {
      const { rows } = await client.query(sql, params);
      for (const r of rows) clashes.push(`${label}: ${show(r)}`);
    };
    const ids = (t) => (src[t]?.rows ?? []).map((r) => r.id);
    if (src.users) {
      await check(
        'email already used by another account',
        'SELECT email FROM users WHERE LOWER(email) = ANY($1) AND NOT (id = ANY($2::uuid[]))',
        [src.users.rows.map((u) => u.email.toLowerCase()), ids('users')],
        (r) => mask(r.email),
      );
    }
    if (src.applications) {
      const refs = src.applications.rows.map((a) => a.reference_number).filter(Boolean);
      const uids = src.applications.rows.map((a) => a.uid_number).filter(Boolean);
      await check(
        'reference number already used by another application',
        'SELECT reference_number FROM applications WHERE reference_number = ANY($1) AND NOT (id = ANY($2::uuid[]))',
        [refs, ids('applications')],
        (r) => r.reference_number,
      );
      await check(
        'UID already used by another application',
        'SELECT uid_number FROM applications WHERE uid_number = ANY($1) AND NOT (id = ANY($2::uuid[]))',
        [uids, ids('applications')],
        (r) => r.uid_number,
      );
    }
    if (src.associations) {
      await check(
        'association already exists under another id',
        `SELECT name, country FROM associations
         WHERE lower(trim(name)) || '|' || lower(trim(country)) = ANY($1) AND NOT (id = ANY($2::uuid[]))`,
        [src.associations.rows.map((a) => `${a.name.trim().toLowerCase()}|${a.country.trim().toLowerCase()}`), ids('associations')],
        (r) => `${r.name} (${r.country})`,
      );
    }
    if (src.magic_tokens) {
      await check(
        'link already exists under another id',
        'SELECT id FROM magic_tokens WHERE token_hash = ANY($1) AND NOT (id = ANY($2::uuid[]))',
        [src.magic_tokens.rows.map((t) => t.token_hash), ids('magic_tokens')],
        (r) => r.id,
      );
    }
    if (clashes.length && !replace) {
      console.error('Nothing imported — these records clash with different records already in this database:');
      for (const c of clashes) console.error(`  - ${c}`);
      console.error(
        'Import into an empty database, or — if everything already there is test data — run again with ' +
          '--replace-existing-data (add --dry-run first to see what would be deleted).',
      );
      process.exit(1);
    }

    await client.query('BEGIN');

    if (replace) {
      // Same transaction as the import: if anything below fails, the existing
      // data is restored by the ROLLBACK.
      const removed = [];
      for (const table of TABLES) {
        const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
        if (rows[0].n) removed.push(`${table} ${rows[0].n}`);
      }
      await client.query(`TRUNCATE ${TABLES.join(', ')}`);
      console.log(`Deleting existing records: ${removed.length ? removed.join(', ') : 'none (already empty)'}`);
    }

    const summary = [];
    for (const table of TABLES) {
      if (!src[table]) continue;
      const deferred = SECOND_PASS[table] ?? [];
      const cols = columnsOf[table].filter((c) => !deferred.includes(c));
      const { rows: present } = await client.query(`SELECT id FROM ${table} WHERE id = ANY($1::uuid[])`, [ids(table)]);
      const skip = new Set(present.map((r) => r.id));
      const todo = src[table].rows.filter((r) => !skip.has(r.id));

      for (let start = 0; start < todo.length; start += 100) {
        const batch = todo.slice(start, start + 100);
        const values = [];
        const tuples = batch.map((row) => `(${cols.map((c) => `$${values.push(row[c])}`).join(', ')})`);
        await client.query(
          `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES ${tuples.join(', ')}`,
          values,
        );
      }
      summary.push({ table, imported: todo.length, alreadyPresent: skip.size });
    }

    // Second pass: references to rows that did not exist during the first pass.
    for (const [table, cols] of Object.entries(SECOND_PASS)) {
      for (const row of src[table]?.rows ?? []) {
        for (const c of cols) {
          if (row[c] === null) continue;
          await client.query(`UPDATE ${table} SET "${c}" = $2 WHERE id = $1 AND "${c}" IS NULL`, [row.id, row[c]]);
        }
      }
    }

    // New submissions must continue after the highest imported numbers. When
    // replacing, the old (test) numbers are gone, so the counters are set to the
    // imported maximum exactly — even if test submissions had pushed them higher.
    for (const [seq, column] of [
      ['application_ref_seq', 'reference_number'],
      ['application_uid_seq', 'uid_number'],
    ]) {
      const highest = `(SELECT MAX(NULLIF(regexp_replace(${column}, '\\D', '', 'g'), '')::BIGINT) AS m FROM applications)`;
      await client.query(
        replace
          ? `SELECT setval('${seq}', COALESCE(m, 1), m IS NOT NULL) FROM ${highest} s`
          : `SELECT setval('${seq}', m, true) FROM ${highest} s WHERE m IS NOT NULL AND m >= (SELECT last_value FROM ${seq})`,
      );
    }
    const { rows: next } = await client.query(
      "SELECT last_value, is_called FROM application_ref_seq",
    );
    const nextRef = Number(next[0].last_value) + (next[0].is_called ? 1 : 0);

    if (dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    for (const s of summary) {
      console.log(`${s.table.padEnd(32)} imported: ${String(s.imported).padStart(4)}   already present: ${s.alreadyPresent}`);
    }
    console.log(`Next reference number: EP-${String(nextRef).padStart(4, '0')}`);
    console.log(dryRun ? 'Dry run: everything checked, nothing was changed.' : 'Import complete.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Import failed, nothing was changed: ${error.message || error}`);
  process.exit(1);
});
