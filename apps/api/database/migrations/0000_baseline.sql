-- =============================================================================
-- 0000 — Baseline: the complete FAFICS schema, for an EMPTY database.
--
-- Generated from a database fully repaired by 0001 + 0002 (pg_dump
-- --schema-only), so a new database ends up identical to a repaired one.
-- Contains no data. Leaves out the optional search indexes that need the
-- pg_trgm / unaccent extensions: 0001 adds those where the server allows it.
--
-- scripts/migrate.js never runs this file on a database that already has the
-- FAFICS tables; there it is only recorded as applied.
-- =============================================================================

CREATE TYPE public.application_status AS ENUM (
    'draft',
    'submitted',
    'changes_requested',
    'endorsed',
    'under_review',
    'approved',
    'rejected',
    'expired'
);

CREATE TYPE public.expertise_level AS ENUM (
    'average',
    'advanced',
    'expert'
);

CREATE TYPE public.notification_type AS ENUM (
    'submission_confirmation',
    'president_review_request',
    'president_link_expired',
    'changes_requested',
    'endorsed',
    'secretary_review_pending',
    'approved',
    'rejected',
    'renewal_reminder_90d',
    'renewal_reminder_30d',
    'expired',
    'applicant_edit_link',
    'draft_saved_link',
    'password_reset',
    'password_changed'
);

CREATE TYPE public.proficiency_level AS ENUM (
    'mother_tongue',
    'proficient',
    'working_level',
    'basic'
);

CREATE TYPE public.queue_job_type AS ENUM (
    'send_email',
    'send_president_link',
    'expire_applications',
    'send_renewal_reminder',
    'send_draft_resume_link'
);

CREATE TYPE public.token_purpose AS ENUM (
    'president_review',
    'email_verification',
    'password_reset',
    'applicant_edit'
);

CREATE TYPE public.user_role AS ENUM (
    'member',
    'president',
    'secretary',
    'committee',
    'admin',
    'management'
);

CREATE FUNCTION public.check_max_preferred_areas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.is_preferred = true THEN
    IF (
      SELECT COUNT(*) FROM application_expertise
      WHERE  application_id = NEW.application_id
        AND  is_preferred   = true
        AND  id            <> COALESCE(NEW.id, gen_random_uuid())
    ) >= 3 THEN
      RAISE EXCEPTION 'An application may have at most 3 preferred expertise areas.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_expire_applications() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE affected INTEGER;
BEGIN
  WITH expired AS (
    UPDATE applications
    SET    status = 'expired', updated_at = NOW()
    WHERE  status = 'approved' AND expires_at < CURRENT_DATE
    RETURNING id
  )
  INSERT INTO audit_logs (application_id, actor_email, actor_role, action, old_status, new_status, metadata)
  SELECT id, 'system@fafics.org', 'admin', 'system.expiry_run', 'approved', 'expired',
         jsonb_build_object('reason', 'automatic_expiry', 'expired_at', NOW())
  FROM expired;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE FUNCTION public.fn_generate_reference_number() RETURNS character varying
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN 'EP-' || LPAD(NEXTVAL('application_ref_seq')::TEXT, 4, '0');
END;
$$;

CREATE FUNCTION public.fn_generate_uid() RETURNS character varying
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN LPAD(NEXTVAL('application_uid_seq')::TEXT, 4, '0');
END;
$$;

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TABLE public.application_educations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    sort_order smallint DEFAULT 1 NOT NULL,
    degree_name character varying(255) NOT NULL,
    institution character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.application_expertise (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    sort_order smallint DEFAULT 1 NOT NULL,
    area_key character varying(100) NOT NULL,
    area_label character varying(255) NOT NULL,
    expertise_level public.expertise_level,
    is_preferred boolean DEFAULT false NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    custom_index smallint,
    other_description character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.application_fafics_experiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    sort_order smallint DEFAULT 1 NOT NULL,
    position_held character varying(255) NOT NULL,
    area_of_contribution text,
    duration_years numeric(4,1),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    area_of_contribution_other text
);

CREATE TABLE public.application_languages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    sort_order smallint DEFAULT 1 NOT NULL,
    language character varying(100) NOT NULL,
    proficiency public.proficiency_level NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.application_local_experiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    sort_order smallint DEFAULT 1 NOT NULL,
    position_held character varying(255) NOT NULL,
    area_of_contribution character varying(100),
    duration_years numeric(4,1),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.application_nonun_experiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    sort_order smallint DEFAULT 1 NOT NULL,
    organization character varying(255) NOT NULL,
    position_title character varying(255) NOT NULL,
    area_of_expertise character varying(100),
    duration_years numeric(4,1),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.application_ref_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.application_uid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.application_un_experiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    sort_order smallint DEFAULT 1 NOT NULL,
    agency character varying(100) NOT NULL,
    position_title character varying(255) NOT NULL,
    grade character varying(20),
    area_of_expertise character varying(100),
    duration_years numeric(4,1),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_number character varying(20),
    uid_number character varying(20),
    user_id uuid NOT NULL,
    association_id uuid NOT NULL,
    status public.application_status DEFAULT 'draft'::public.application_status NOT NULL,
    first_name character varying(100) NOT NULL,
    middle_name character varying(100),
    last_name character varying(100) NOT NULL,
    date_of_birth date,
    nationality character varying(100) NOT NULL,
    second_nationality character varying(100),
    gender character varying(50) NOT NULL,
    phone character varying(50) NOT NULL,
    whatsapp character varying(50),
    email character varying(255) NOT NULL,
    separation_date date,
    association_name character varying(255) NOT NULL,
    association_country character varying(100) NOT NULL,
    association_general_email character varying(255),
    president_email character varying(255) NOT NULL,
    president_phone character varying(50) NOT NULL,
    associate_member_name character varying(255),
    associate_member_country character varying(100),
    un_experience_summary text,
    non_un_experience_summary text,
    fafics_experience_summary text,
    local_experience_summary text,
    consent_data boolean DEFAULT false NOT NULL,
    consent_accurate boolean DEFAULT false NOT NULL,
    consented_at timestamp with time zone,
    president_notes text,
    secretary_notes text,
    submitted_at timestamp with time zone,
    endorsed_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    expires_at date,
    renewal_reminder_90d_sent_at timestamp with time zone,
    renewal_reminder_30d_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    preferred_committees text[] DEFAULT ARRAY[]::text[] NOT NULL,
    position_preference_rationale text,
    competencies text[] DEFAULT ARRAY[]::text[] NOT NULL,
    preferred_committees_other text
);

CREATE TABLE public.associations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    country character varying(100) NOT NULL,
    phone character varying(50),
    email character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    president_user_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    actor_id uuid,
    actor_email character varying(255) NOT NULL,
    actor_role public.user_role NOT NULL,
    action character varying(100) NOT NULL,
    old_status public.application_status,
    new_status public.application_status,
    metadata jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.magic_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash character varying(255) NOT NULL,
    purpose public.token_purpose NOT NULL,
    application_id uuid,
    user_id uuid,
    recipient_email character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    recipient_email character varying(255) NOT NULL,
    notification_type public.notification_type NOT NULL,
    provider_message_id character varying(255),
    queue_job_id character varying(255),
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    role public.user_role DEFAULT 'member'::public.user_role NOT NULL,
    association_id uuid,
    first_name character varying(100),
    last_name character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    email_verified_at timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    password_changed_at timestamp with time zone
);

CREATE VIEW public.vw_active_roster AS
 SELECT id,
    reference_number,
    uid_number,
    first_name,
    last_name,
    nationality,
    second_nationality,
    gender,
    email,
    phone,
    association_name,
    association_country,
    separation_date,
    approved_at,
    expires_at,
    ARRAY( SELECT ae.area_label
           FROM public.application_expertise ae
          WHERE ((ae.application_id = a.id) AND (ae.is_preferred = true))
          ORDER BY ae.sort_order) AS preferred_areas,
    ARRAY( SELECT ((((al.language)::text || ' ('::text) || al.proficiency) || ')'::text)
           FROM public.application_languages al
          WHERE (al.application_id = a.id)
          ORDER BY al.sort_order) AS languages,
    ARRAY( SELECT ae.area_label
           FROM public.application_expertise ae
          WHERE ((ae.application_id = a.id) AND (ae.expertise_level = 'expert'::public.expertise_level))
          ORDER BY ae.sort_order) AS expert_areas
   FROM public.applications a
  WHERE (status = 'approved'::public.application_status);

CREATE VIEW public.vw_dashboard_stats AS
 SELECT count(*) FILTER (WHERE (status = 'submitted'::public.application_status)) AS pending_endorsement,
    count(*) FILTER (WHERE (status = 'endorsed'::public.application_status)) AS pending_review,
    count(*) FILTER (WHERE (status = 'under_review'::public.application_status)) AS under_review,
    count(*) FILTER (WHERE (status = 'approved'::public.application_status)) AS active_in_pool,
    count(*) FILTER (WHERE (status = 'changes_requested'::public.application_status)) AS changes_requested,
    count(*) FILTER (WHERE (status = 'rejected'::public.application_status)) AS rejected,
    count(*) FILTER (WHERE (status = 'expired'::public.application_status)) AS expired,
    count(*) FILTER (WHERE (status = 'draft'::public.application_status)) AS drafts,
    count(*) FILTER (WHERE ((status = 'approved'::public.application_status) AND ((expires_at >= CURRENT_DATE) AND (expires_at <= (CURRENT_DATE + '90 days'::interval))))) AS expiring_in_90_days
   FROM public.applications;

ALTER TABLE ONLY public.application_educations
    ADD CONSTRAINT application_educations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.application_expertise
    ADD CONSTRAINT application_expertise_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.application_fafics_experiences
    ADD CONSTRAINT application_fafics_experiences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.application_languages
    ADD CONSTRAINT application_languages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.application_local_experiences
    ADD CONSTRAINT application_local_experiences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.application_nonun_experiences
    ADD CONSTRAINT application_nonun_experiences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.application_un_experiences
    ADD CONSTRAINT application_un_experiences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.associations
    ADD CONSTRAINT associations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX application_educations_application_id_idx ON public.application_educations USING btree (application_id);

CREATE INDEX application_expertise_application_id_idx ON public.application_expertise USING btree (application_id);

CREATE INDEX application_expertise_area_key_idx ON public.application_expertise USING btree (area_key);

CREATE INDEX application_fafics_experiences_application_id_idx ON public.application_fafics_experiences USING btree (application_id);

CREATE INDEX application_languages_application_id_idx ON public.application_languages USING btree (application_id);

CREATE INDEX application_local_experiences_application_id_idx ON public.application_local_experiences USING btree (application_id);

CREATE INDEX application_nonun_experiences_application_id_idx ON public.application_nonun_experiences USING btree (application_id);

CREATE INDEX application_un_experiences_application_id_idx ON public.application_un_experiences USING btree (application_id);

CREATE INDEX applications_association_id_idx ON public.applications USING btree (association_id);

CREATE INDEX applications_expires_at_idx ON public.applications USING btree (expires_at);

CREATE UNIQUE INDEX applications_reference_number_key ON public.applications USING btree (reference_number);

CREATE INDEX applications_status_idx ON public.applications USING btree (status);

CREATE INDEX applications_submitted_at_idx ON public.applications USING btree (submitted_at DESC);

CREATE UNIQUE INDEX applications_uid_number_key ON public.applications USING btree (uid_number);

CREATE INDEX applications_user_id_idx ON public.applications USING btree (user_id);

CREATE UNIQUE INDEX associations_president_user_id_key ON public.associations USING btree (president_user_id);

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);

CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs USING btree (actor_id);

CREATE INDEX audit_logs_application_id_idx ON public.audit_logs USING btree (application_id);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_applications_expires_approved ON public.applications USING btree (expires_at) WHERE (status = 'approved'::public.application_status);

CREATE INDEX idx_expertise_preferred ON public.application_expertise USING btree (application_id) WHERE (is_preferred = true);

CREATE INDEX idx_magic_tokens_expires_unused ON public.magic_tokens USING btree (expires_at) WHERE (used_at IS NULL);

CREATE INDEX magic_tokens_expires_at_idx ON public.magic_tokens USING btree (expires_at);

CREATE INDEX magic_tokens_token_hash_idx ON public.magic_tokens USING btree (token_hash);

CREATE UNIQUE INDEX magic_tokens_token_hash_key ON public.magic_tokens USING btree (token_hash);

CREATE INDEX notification_logs_application_id_idx ON public.notification_logs USING btree (application_id);

CREATE UNIQUE INDEX uidx_application_active_user_assoc ON public.applications USING btree (user_id, association_id) WHERE (status <> ALL (ARRAY['rejected'::public.application_status, 'expired'::public.application_status]));

CREATE UNIQUE INDEX uidx_association_name_country ON public.associations USING btree (lower(TRIM(BOTH FROM name)), lower(TRIM(BOTH FROM country)));

CREATE UNIQUE INDEX uidx_expertise_fixed_area ON public.application_expertise USING btree (application_id, area_key) WHERE (is_custom = false);

CREATE INDEX users_association_id_idx ON public.users USING btree (association_id);

CREATE INDEX users_email_idx ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE INDEX users_role_idx ON public.users USING btree (role);

CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_associations_updated_at BEFORE UPDATE ON public.associations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_max_preferred_areas BEFORE INSERT OR UPDATE ON public.application_expertise FOR EACH ROW EXECUTE FUNCTION public.check_max_preferred_areas();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

ALTER TABLE ONLY public.application_educations
    ADD CONSTRAINT application_educations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.application_expertise
    ADD CONSTRAINT application_expertise_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.application_fafics_experiences
    ADD CONSTRAINT application_fafics_experiences_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.application_languages
    ADD CONSTRAINT application_languages_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.application_local_experiences
    ADD CONSTRAINT application_local_experiences_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.application_nonun_experiences
    ADD CONSTRAINT application_nonun_experiences_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.application_un_experiences
    ADD CONSTRAINT application_un_experiences_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_association_id_fkey FOREIGN KEY (association_id) REFERENCES public.associations(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.associations
    ADD CONSTRAINT associations_president_user_id_fkey FOREIGN KEY (president_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_association_id_fkey FOREIGN KEY (association_id) REFERENCES public.associations(id) ON UPDATE CASCADE ON DELETE SET NULL;
