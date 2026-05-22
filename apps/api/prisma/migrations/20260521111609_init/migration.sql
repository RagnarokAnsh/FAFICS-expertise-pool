-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('member', 'president', 'secretary', 'committee', 'admin');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('draft', 'submitted', 'changes_requested', 'endorsed', 'under_review', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "expertise_level" AS ENUM ('average', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "proficiency_level" AS ENUM ('mother_tongue', 'proficient', 'working_level', 'basic');

-- CreateEnum
CREATE TYPE "token_purpose" AS ENUM ('president_review', 'email_verification', 'password_reset');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('submission_confirmation', 'president_review_request', 'president_link_expired', 'changes_requested', 'endorsed', 'secretary_review_pending', 'approved', 'rejected', 'renewal_reminder_90d', 'renewal_reminder_30d', 'expired');

-- CreateEnum
CREATE TYPE "queue_job_type" AS ENUM ('send_email', 'send_president_link', 'expire_applications', 'send_renewal_reminder');

-- CreateTable
CREATE TABLE "associations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "president_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "role" "user_role" NOT NULL DEFAULT 'member',
    "association_id" UUID,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference_number" VARCHAR(20),
    "uid_number" VARCHAR(20),
    "user_id" UUID NOT NULL,
    "association_id" UUID NOT NULL,
    "status" "application_status" NOT NULL DEFAULT 'draft',
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "nationality" VARCHAR(100) NOT NULL,
    "second_nationality" VARCHAR(100),
    "gender" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "whatsapp" VARCHAR(50),
    "email" VARCHAR(255) NOT NULL,
    "separation_date" DATE NOT NULL,
    "association_name" VARCHAR(255) NOT NULL,
    "association_country" VARCHAR(100) NOT NULL,
    "association_general_email" VARCHAR(255),
    "president_email" VARCHAR(255) NOT NULL,
    "president_phone" VARCHAR(50) NOT NULL,
    "associate_member_name" VARCHAR(255),
    "associate_member_country" VARCHAR(100),
    "un_experience_summary" TEXT,
    "non_un_experience_summary" TEXT,
    "fafics_experience_summary" TEXT,
    "local_experience_summary" TEXT,
    "consent_data" BOOLEAN NOT NULL DEFAULT false,
    "consent_accurate" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" TIMESTAMPTZ,
    "president_notes" TEXT,
    "secretary_notes" TEXT,
    "submitted_at" TIMESTAMPTZ,
    "endorsed_at" TIMESTAMPTZ,
    "approved_at" TIMESTAMPTZ,
    "rejected_at" TIMESTAMPTZ,
    "expires_at" DATE,
    "renewal_reminder_90d_sent_at" TIMESTAMPTZ,
    "renewal_reminder_30d_sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_educations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 1,
    "degree_name" VARCHAR(255) NOT NULL,
    "institution" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_languages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 1,
    "language" VARCHAR(100) NOT NULL,
    "proficiency" "proficiency_level" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_un_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 1,
    "agency" VARCHAR(100) NOT NULL,
    "position_title" VARCHAR(255) NOT NULL,
    "grade" VARCHAR(20),
    "area_of_expertise" VARCHAR(100),
    "duration_years" DECIMAL(4,1),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_un_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_nonun_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 1,
    "organization" VARCHAR(255) NOT NULL,
    "position_title" VARCHAR(255) NOT NULL,
    "area_of_expertise" VARCHAR(100),
    "duration_years" DECIMAL(4,1),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_nonun_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_fafics_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 1,
    "position_held" VARCHAR(255) NOT NULL,
    "area_of_contribution" VARCHAR(100),
    "duration_years" DECIMAL(4,1),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_fafics_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_local_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 1,
    "position_held" VARCHAR(255) NOT NULL,
    "area_of_contribution" VARCHAR(100),
    "duration_years" DECIMAL(4,1),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_local_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_expertise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 1,
    "area_key" VARCHAR(100) NOT NULL,
    "area_label" VARCHAR(255) NOT NULL,
    "expertise_level" "expertise_level",
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "custom_index" SMALLINT,
    "other_description" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_expertise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" VARCHAR(255) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "purpose" "token_purpose" NOT NULL,
    "application_id" UUID,
    "user_id" UUID,
    "recipient_email" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID,
    "actor_id" UUID,
    "actor_email" VARCHAR(255) NOT NULL,
    "actor_role" "user_role" NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "old_status" "application_status",
    "new_status" "application_status",
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID,
    "recipient_email" VARCHAR(255) NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "provider_message_id" VARCHAR(255),
    "queue_job_id" VARCHAR(255),
    "sent_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "associations_president_user_id_key" ON "associations"("president_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_association_id_idx" ON "users"("association_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_reference_number_key" ON "applications"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "applications_uid_number_key" ON "applications"("uid_number");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE INDEX "applications_association_id_idx" ON "applications"("association_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_submitted_at_idx" ON "applications"("submitted_at" DESC);

-- CreateIndex
CREATE INDEX "applications_expires_at_idx" ON "applications"("expires_at");

-- CreateIndex
CREATE INDEX "application_educations_application_id_idx" ON "application_educations"("application_id");

-- CreateIndex
CREATE INDEX "application_languages_application_id_idx" ON "application_languages"("application_id");

-- CreateIndex
CREATE INDEX "application_un_experiences_application_id_idx" ON "application_un_experiences"("application_id");

-- CreateIndex
CREATE INDEX "application_nonun_experiences_application_id_idx" ON "application_nonun_experiences"("application_id");

-- CreateIndex
CREATE INDEX "application_fafics_experiences_application_id_idx" ON "application_fafics_experiences"("application_id");

-- CreateIndex
CREATE INDEX "application_local_experiences_application_id_idx" ON "application_local_experiences"("application_id");

-- CreateIndex
CREATE INDEX "application_expertise_area_key_idx" ON "application_expertise"("area_key");

-- CreateIndex
CREATE INDEX "application_expertise_application_id_idx" ON "application_expertise"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "magic_tokens_token_key" ON "magic_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "magic_tokens_token_hash_key" ON "magic_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "magic_tokens_token_hash_idx" ON "magic_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "magic_tokens_expires_at_idx" ON "magic_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_application_id_idx" ON "audit_logs"("application_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "notification_logs_application_id_idx" ON "notification_logs"("application_id");

-- AddForeignKey
ALTER TABLE "associations" ADD CONSTRAINT "associations_president_user_id_fkey" FOREIGN KEY ("president_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "associations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_educations" ADD CONSTRAINT "application_educations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_languages" ADD CONSTRAINT "application_languages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_un_experiences" ADD CONSTRAINT "application_un_experiences_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_nonun_experiences" ADD CONSTRAINT "application_nonun_experiences_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_fafics_experiences" ADD CONSTRAINT "application_fafics_experiences_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_local_experiences" ADD CONSTRAINT "application_local_experiences_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_expertise" ADD CONSTRAINT "application_expertise_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_tokens" ADD CONSTRAINT "magic_tokens_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_tokens" ADD CONSTRAINT "magic_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
