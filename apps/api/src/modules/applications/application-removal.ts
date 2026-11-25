import { UserRole } from '@fafics/shared';
import { DatabaseService } from '../../database/database.service';

/**
 * Permanently deletes an application: its data, its history and its email
 * log, as the consent text promises. One anonymous audit entry (reference
 * number + why) is kept as the record that it existed. The applicant's user
 * row only exists to own applications, so it goes too once none remain.
 *
 * Used when a profile expires and when an officer removes it from the pool.
 * Returns null when the application no longer exists.
 */
export async function deleteApplicationAndData(
  prisma: DatabaseService,
  id: string,
  record: {
    action: string;
    actorEmail: string;
    actorRole: UserRole | `${UserRole}`;
    actorId?: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<{ referenceNumber: string | null } | null> {
  const app = await prisma.application.findUnique({
    where: { id },
    select: { referenceNumber: true, userId: true, status: true, associationName: true },
  });
  if (!app) return null;

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { applicationId: id } });
    await tx.notificationLog.deleteMany({ where: { applicationId: id } });
    await tx.application.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorEmail: record.actorEmail,
        actorRole: record.actorRole,
        actorId: record.actorId,
        action: record.action,
        oldStatus: app.status,
        metadata: {
          referenceNumber: app.referenceNumber,
          association: app.associationName,
          ...(record.metadata ?? {}),
        },
      },
    });
  });

  await prisma.user.deleteMany({
    where: { id: app.userId, role: 'member', applications: { none: {} } },
  });
  return { referenceNumber: app.referenceNumber };
}
