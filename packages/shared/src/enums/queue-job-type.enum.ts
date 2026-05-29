/**
 * BullMQ job type names used as the `name` argument in queue.add().
 * Matches the PostgreSQL queue_job_type enum and Prisma QueueJobType.
 */
export enum QueueJobType {
  SEND_EMAIL = 'send_email',
  SEND_PRESIDENT_LINK = 'send_president_link',
  EXPIRE_APPLICATIONS = 'expire_applications',
  SEND_RENEWAL_REMINDER = 'send_renewal_reminder',
  SEND_DRAFT_RESUME_LINK = 'send_draft_resume_link',
}
