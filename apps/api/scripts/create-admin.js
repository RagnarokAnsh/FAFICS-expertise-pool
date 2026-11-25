/**
 * Creates the first administrator account — for a new, empty database, where
 * nobody could otherwise sign in to the dashboard.
 *
 *   ADMIN_EMAIL=you@fafics.org ADMIN_PASSWORD='…' npm run create-admin
 *
 * Optional: ADMIN_FIRST_NAME, ADMIN_LAST_NAME (default "System Admin").
 * Uses DATABASE_URL from the environment (or .env).
 *
 * Never changes an existing dashboard account: if the address already belongs
 * to one, it stops without touching it. The password must meet the dashboard
 * rule (12+ characters with an upper-case letter, a lower-case letter and a
 * number). Unlike seed-required-data.ts it creates nothing else, needs no
 * development tools, and is safe to run on production.
 */
const path = require('path');
const bcrypt = require('bcrypt');
const { isEmail } = require('class-validator');
const { Client } = require('pg');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv is optional — the variables may come from the real environment.
}

const OFFICER_ROLES = ['admin', 'secretary', 'committee', 'management'];
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const firstName = (process.env.ADMIN_FIRST_NAME || 'System').trim();
  const lastName = (process.env.ADMIN_LAST_NAME || 'Admin').trim();

  if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set.');
  if (!isEmail(email)) fail('Set ADMIN_EMAIL to the administrator\'s email address.');
  if (password.length < 12 || password.length > 72 || !PASSWORD_PATTERN.test(password)) {
    fail(
      'Set ADMIN_PASSWORD to a password of 12-72 characters with an upper-case letter, ' +
        'a lower-case letter and a number.',
    );
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, role, password_hash FROM users WHERE LOWER(email) = $1 ORDER BY created_at LIMIT 1',
      [email],
    );
    const existing = rows[0];

    if (existing && (OFFICER_ROLES.includes(existing.role) || existing.password_hash)) {
      console.log(`${email} already has a dashboard account (role: ${existing.role}). Nothing changed.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    if (existing) {
      // The address belongs to an applicant record: make that record the admin
      // account, so their applications stay linked to the same person.
      await client.query(
        `UPDATE users SET password_hash = $2, role = 'admin', first_name = $3, last_name = $4,
                          is_active = true, email_verified_at = COALESCE(email_verified_at, NOW())
         WHERE id = $1`,
        [existing.id, passwordHash, firstName, lastName],
      );
    } else {
      await client.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, email_verified_at)
         VALUES ($1, $2, 'admin', $3, $4, true, NOW())`,
        [email, passwordHash, firstName, lastName],
      );
    }
    console.log(`Administrator ${email} created. Sign in at /admin/login.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => fail(error.message || String(error)));
