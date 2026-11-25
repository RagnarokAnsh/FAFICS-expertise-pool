/**
 * Applies the SQL files in database/migrations/ in name order, once each.
 *
 * Prisma has been removed from the backend, so this replaces `prisma migrate
 * deploy`. Applied files are recorded in the schema_migrations table; each file
 * runs in its own transaction, so a failing file leaves nothing half-applied
 * and stops the run.
 *
 *   npm run db:migrate              apply pending migrations
 *   npm run db:migrate -- --status  list applied / pending, change nothing
 *
 * Works on an EMPTY database (0000_baseline.sql creates the whole schema) and
 * on an existing one (the baseline is then only recorded, never run).
 *
 * Uses DATABASE_URL from the environment (or .env). Take a backup first:
 *   pg_dump "$DATABASE_URL" > backup-before-migrate.sql
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv is optional — DATABASE_URL may come from the real environment.
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

async function main() {
  const statusOnly = process.argv.includes('--status');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  // Surface the migrations' own "Skipped ..." notices (optional parts that
  // could not be applied); drop Postgres' routine IF-NOT-EXISTS chatter.
  client.on('notice', (n) => {
    if (/^Skipped/.test(n.message)) console.log(`  note: ${n.message}`);
  });
  try {
    // --status only looks: it never creates the tracking table.
    const { rows: tracking } = await client.query(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
    );
    if (!statusOnly) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name       VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      // The API checks this list at startup. When migrations run as a different
      // (owner) account than the API uses, the API must still be able to read it.
      // It only holds file names. Best effort: only the table owner may grant.
      await client.query('GRANT SELECT ON schema_migrations TO PUBLIC').catch(() => undefined);
    }
    const { rows } =
      statusOnly && !tracking[0].exists
        ? { rows: [] }
        : await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const pending = files.filter((f) => !applied.has(f));

    // The baseline (0000_*) creates the whole schema and is only for an empty
    // database. Where the FAFICS tables already exist it must not run.
    const { rows: existing } = await client.query(
      "SELECT to_regclass('public.applications') IS NOT NULL AS has_tables",
    );
    const hasTables = existing[0].has_tables;
    const isBaseline = (f) => /^0000_/.test(f);

    if (statusOnly) {
      for (const f of files) {
        const note = !applied.has(f) && isBaseline(f) && hasTables ? '  (tables exist: will only be recorded)' : '';
        console.log(`${applied.has(f) ? 'applied' : 'pending'}  ${f}${note}`);
      }
      return;
    }
    if (pending.length === 0) {
      console.log('Database is up to date.');
      return;
    }

    for (const file of pending) {
      if (isBaseline(file) && hasTables) {
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        console.log(`Recorded ${file} (the tables already exist, nothing to create)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`Applying ${file} ... `);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log('done');
      } catch (error) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        throw error;
      }
    }
    console.log('All migrations applied. Restart the API so it picks up the new schema.');
  } finally {
    await client.end();
  }
}

main().catch(async (error) => {
  console.error(error.message || error);
  // 42501 insufficient_privilege: "must be owner of …" / "permission denied …"
  if (error && error.code === '42501') {
    try {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      const { rows } = await client.query(
        `SELECT current_user AS me,
                (SELECT tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applications') AS owner,
                (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = current_database()) AS db_owner`,
      );
      await client.end();
      const { me, owner, db_owner: dbOwner } = rows[0];
      if (owner) {
        console.error(
          `\nThe migration ran as "${me}", but the tables are owned by "${owner}".` +
            '\nRun it as the owner instead, e.g.:' +
            `\n  DATABASE_URL="postgresql://${owner}:<password>@<host>:5432/<database>" npm run db:migrate`,
        );
      } else {
        // Empty database: this user may not create tables in the public schema
        // (the default on PostgreSQL 15+ unless the user owns the database).
        console.error(
          `\nThe database user "${me}" is not allowed to create tables in this database.` +
            `\nEither run the migration as the database owner ("${dbOwner}"), or have the owner run:` +
            `\n  GRANT USAGE, CREATE ON SCHEMA public TO "${me}";`,
        );
      }
      console.error('Nothing was changed: each migration file runs in a single transaction.');
    } catch {
      console.error('\nRun the migration as the database user that owns the tables. Nothing was changed.');
    }
  }
  process.exit(1);
});
