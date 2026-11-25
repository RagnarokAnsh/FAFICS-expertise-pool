/**
 * Field → column registry for DatabaseService.
 *
 * Mirrors the tables in faficsdb.sql / database/migrations. Every identifier the
 * query builder emits comes from here, so a field that is not listed cannot
 * reach SQL. When a migration adds a column, add it here too.
 */

export type Relation =
  /** Rows in `model` whose `foreignKey` field equals this row's id. */
  | { kind: 'many'; model: ModelName; foreignKey: string }
  /** The row in `model` whose `targetKey` field equals this row's `localKey`. */
  | { kind: 'one'; model: ModelName; localKey: string; targetKey: string };

export interface ModelDef {
  name: ModelName;
  table: string;
  fields: Record<string, string>;
  relations?: Record<string, Relation>;
  /** Fields stored as jsonb — objects are JSON-encoded on write. */
  json?: string[];
}

export type ModelName =
  | 'association'
  | 'user'
  | 'application'
  | 'applicationEducation'
  | 'applicationLanguage'
  | 'applicationUnExperience'
  | 'applicationNonUnExperience'
  | 'applicationFaficsExperience'
  | 'applicationLocalExperience'
  | 'applicationExpertise'
  | 'magicToken'
  | 'auditLog'
  | 'notificationLog';

const childOfApplication = { application: { kind: 'one', model: 'application', localKey: 'applicationId', targetKey: 'id' } } as const;

export const MODELS: Record<ModelName, ModelDef> = {
  association: {
    name: 'association',
    table: 'associations',
    fields: {
      id: 'id',
      name: 'name',
      country: 'country',
      phone: 'phone',
      email: 'email',
      isActive: 'is_active',
      presidentUserId: 'president_user_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    relations: {
      president: { kind: 'one', model: 'user', localKey: 'presidentUserId', targetKey: 'id' },
      members: { kind: 'many', model: 'user', foreignKey: 'associationId' },
      applications: { kind: 'many', model: 'application', foreignKey: 'associationId' },
    },
  },

  user: {
    name: 'user',
    table: 'users',
    fields: {
      id: 'id',
      email: 'email',
      passwordHash: 'password_hash',
      role: 'role',
      associationId: 'association_id',
      firstName: 'first_name',
      lastName: 'last_name',
      isActive: 'is_active',
      emailVerifiedAt: 'email_verified_at',
      lastLoginAt: 'last_login_at',
      passwordChangedAt: 'password_changed_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    relations: {
      association: { kind: 'one', model: 'association', localKey: 'associationId', targetKey: 'id' },
      presidedAssociation: { kind: 'one', model: 'association', localKey: 'id', targetKey: 'presidentUserId' },
      applications: { kind: 'many', model: 'application', foreignKey: 'userId' },
      magicTokens: { kind: 'many', model: 'magicToken', foreignKey: 'userId' },
      auditLogsActed: { kind: 'many', model: 'auditLog', foreignKey: 'actorId' },
    },
  },

  application: {
    name: 'application',
    table: 'applications',
    fields: {
      id: 'id',
      referenceNumber: 'reference_number',
      uidNumber: 'uid_number',
      userId: 'user_id',
      associationId: 'association_id',
      status: 'status',
      firstName: 'first_name',
      middleName: 'middle_name',
      lastName: 'last_name',
      dateOfBirth: 'date_of_birth',
      nationality: 'nationality',
      secondNationality: 'second_nationality',
      gender: 'gender',
      phone: 'phone',
      whatsapp: 'whatsapp',
      email: 'email',
      separationDate: 'separation_date',
      associationName: 'association_name',
      associationCountry: 'association_country',
      associationGeneralEmail: 'association_general_email',
      presidentEmail: 'president_email',
      presidentPhone: 'president_phone',
      associateMemberName: 'associate_member_name',
      associateMemberCountry: 'associate_member_country',
      unExperienceSummary: 'un_experience_summary',
      nonUnExperienceSummary: 'non_un_experience_summary',
      faficsExperienceSummary: 'fafics_experience_summary',
      localExperienceSummary: 'local_experience_summary',
      preferredCommittees: 'preferred_committees',
      preferredCommitteesOther: 'preferred_committees_other',
      positionPreferenceRationale: 'position_preference_rationale',
      competencies: 'competencies',
      consentData: 'consent_data',
      consentAccurate: 'consent_accurate',
      consentedAt: 'consented_at',
      presidentNotes: 'president_notes',
      secretaryNotes: 'secretary_notes',
      submittedAt: 'submitted_at',
      endorsedAt: 'endorsed_at',
      approvedAt: 'approved_at',
      rejectedAt: 'rejected_at',
      expiresAt: 'expires_at',
      renewalReminder90dSentAt: 'renewal_reminder_90d_sent_at',
      renewalReminder30dSentAt: 'renewal_reminder_30d_sent_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    relations: {
      user: { kind: 'one', model: 'user', localKey: 'userId', targetKey: 'id' },
      association: { kind: 'one', model: 'association', localKey: 'associationId', targetKey: 'id' },
      educations: { kind: 'many', model: 'applicationEducation', foreignKey: 'applicationId' },
      languages: { kind: 'many', model: 'applicationLanguage', foreignKey: 'applicationId' },
      unExperiences: { kind: 'many', model: 'applicationUnExperience', foreignKey: 'applicationId' },
      nonUnExperiences: { kind: 'many', model: 'applicationNonUnExperience', foreignKey: 'applicationId' },
      faficsExperiences: { kind: 'many', model: 'applicationFaficsExperience', foreignKey: 'applicationId' },
      localExperiences: { kind: 'many', model: 'applicationLocalExperience', foreignKey: 'applicationId' },
      expertise: { kind: 'many', model: 'applicationExpertise', foreignKey: 'applicationId' },
      auditLogs: { kind: 'many', model: 'auditLog', foreignKey: 'applicationId' },
      magicTokens: { kind: 'many', model: 'magicToken', foreignKey: 'applicationId' },
      notificationLogs: { kind: 'many', model: 'notificationLog', foreignKey: 'applicationId' },
    },
  },

  applicationEducation: {
    name: 'applicationEducation',
    table: 'application_educations',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      sortOrder: 'sort_order',
      degreeName: 'degree_name',
      institution: 'institution',
      createdAt: 'created_at',
    },
    relations: { ...childOfApplication },
  },

  applicationLanguage: {
    name: 'applicationLanguage',
    table: 'application_languages',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      sortOrder: 'sort_order',
      language: 'language',
      proficiency: 'proficiency',
      createdAt: 'created_at',
    },
    relations: { ...childOfApplication },
  },

  applicationUnExperience: {
    name: 'applicationUnExperience',
    table: 'application_un_experiences',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      sortOrder: 'sort_order',
      agency: 'agency',
      positionTitle: 'position_title',
      grade: 'grade',
      areaOfExpertise: 'area_of_expertise',
      durationYears: 'duration_years',
      createdAt: 'created_at',
    },
    relations: { ...childOfApplication },
  },

  applicationNonUnExperience: {
    name: 'applicationNonUnExperience',
    table: 'application_nonun_experiences',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      sortOrder: 'sort_order',
      organization: 'organization',
      positionTitle: 'position_title',
      areaOfExpertise: 'area_of_expertise',
      durationYears: 'duration_years',
      createdAt: 'created_at',
    },
    relations: { ...childOfApplication },
  },

  applicationFaficsExperience: {
    name: 'applicationFaficsExperience',
    table: 'application_fafics_experiences',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      sortOrder: 'sort_order',
      positionHeld: 'position_held',
      areaOfContribution: 'area_of_contribution',
      areaOfContributionOther: 'area_of_contribution_other',
      durationYears: 'duration_years',
      createdAt: 'created_at',
    },
    relations: { ...childOfApplication },
  },

  applicationLocalExperience: {
    name: 'applicationLocalExperience',
    table: 'application_local_experiences',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      sortOrder: 'sort_order',
      positionHeld: 'position_held',
      areaOfContribution: 'area_of_contribution',
      durationYears: 'duration_years',
      createdAt: 'created_at',
    },
    relations: { ...childOfApplication },
  },

  applicationExpertise: {
    name: 'applicationExpertise',
    table: 'application_expertise',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      sortOrder: 'sort_order',
      areaKey: 'area_key',
      areaLabel: 'area_label',
      expertiseLevel: 'expertise_level',
      isPreferred: 'is_preferred',
      isCustom: 'is_custom',
      customIndex: 'custom_index',
      otherDescription: 'other_description',
      createdAt: 'created_at',
    },
    relations: { ...childOfApplication },
  },

  magicToken: {
    name: 'magicToken',
    table: 'magic_tokens',
    fields: {
      id: 'id',
      tokenHash: 'token_hash',
      purpose: 'purpose',
      applicationId: 'application_id',
      userId: 'user_id',
      recipientEmail: 'recipient_email',
      expiresAt: 'expires_at',
      usedAt: 'used_at',
      createdAt: 'created_at',
    },
    relations: {
      ...childOfApplication,
      user: { kind: 'one', model: 'user', localKey: 'userId', targetKey: 'id' },
    },
  },

  auditLog: {
    name: 'auditLog',
    table: 'audit_logs',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      actorId: 'actor_id',
      actorEmail: 'actor_email',
      actorRole: 'actor_role',
      action: 'action',
      oldStatus: 'old_status',
      newStatus: 'new_status',
      metadata: 'metadata',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
    },
    relations: {
      ...childOfApplication,
      actor: { kind: 'one', model: 'user', localKey: 'actorId', targetKey: 'id' },
    },
    json: ['metadata'],
  },

  notificationLog: {
    name: 'notificationLog',
    table: 'notification_logs',
    fields: {
      id: 'id',
      applicationId: 'application_id',
      recipientEmail: 'recipient_email',
      notificationType: 'notification_type',
      providerMessageId: 'provider_message_id',
      queueJobId: 'queue_job_id',
      sentAt: 'sent_at',
      failedAt: 'failed_at',
      errorMessage: 'error_message',
      createdAt: 'created_at',
    },
    relations: { ...childOfApplication },
  },
};
