import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const adminEmail = process.env.ADMIN_EMAIL || 'admin@fafics.org';
const adminPassword = process.env.ADMIN_PASSWORD;
// Re-running the seed must not silently reset a live admin's password; pass
// --reset-admin-password to do that on purpose.
const resetAdminPassword = process.argv.includes('--reset-admin-password');
const associationId = '00000000-0000-4000-a000-000000000001';

async function ensureAssociation(): Promise<void> {
  await pool.query(
    `
      INSERT INTO associations (
        id,
        name,
        country,
        email,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        country = EXCLUDED.country,
        email = EXCLUDED.email,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `,
    [
      associationId,
      'AFICS Test',
      'Switzerland',
      'test@afics.org',
      true,
    ],
  );

  console.log(`✓ Association ensured: AFICS Test (${associationId})`);
}

async function ensureAdmin(): Promise<void> {
  // No fallback password: the old default ('changeme123!') is public.
  if (!adminPassword || adminPassword === 'changeme123!' || adminPassword.length < 12) {
    throw new Error('Set ADMIN_PASSWORD to a strong password (12+ characters) before seeding.');
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await pool.query(
    `
      INSERT INTO users (
        email,
        password_hash,
        role,
        first_name,
        last_name,
        is_active,
        email_verified_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password_hash = CASE WHEN $7 THEN EXCLUDED.password_hash ELSE users.password_hash END,
        role = EXCLUDED.role,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        is_active = EXCLUDED.is_active,
        email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
        updated_at = NOW()
    `,
    [adminEmail, passwordHash, 'admin', 'System', 'Admin', true, resetAdminPassword],
  );

  console.log(`✓ Admin ensured: ${adminEmail}${resetAdminPassword ? ' (password reset)' : ''}`);
}

async function main(): Promise<void> {
  await ensureAssociation();
  await ensureAdmin();
}

main()
  .then(async () => {
    await pool.end();
    console.log('Seeding complete');
  })
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error);
    await pool.end();
    process.exit(1);
  });
