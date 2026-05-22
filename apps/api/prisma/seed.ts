import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed script: creates the initial admin user and a test association.
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from environment variables.
 *
 * Run with: npx prisma db seed
 */
async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fafics.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123!';

  // Hash the admin password with 12 salt rounds
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // ── Create admin user ─────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      role: UserRole.admin,
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✓ Admin user created: ${admin.email} (id: ${admin.id})`);

  // ── Create test association ───────────────────────────────────────
  const association = await prisma.association.upsert({
    where: { id: '00000000-0000-4000-a000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-a000-000000000001',
      name: 'AFICS Test',
      country: 'Switzerland',
      email: 'test@afics.org',
      isActive: true,
    },
  });

  console.log(
    `✓ Test association created: ${association.name} (id: ${association.id})`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
