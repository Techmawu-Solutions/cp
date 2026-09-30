-- =============================================================================
-- ClassProject Open — global MOOC platform — transactional database schema
-- =============================================================================
-- Target: MySQL 8.0+ (production) — verified to load on MariaDB 10.11 as well.
-- This is Open's OWN database. It never shares tables with ClassProject; the
-- two platforms talk only through the signed partner API (spec section 25).
--
-- What is NOT here (by design, spec section 11.1):
--   * search documents + vector embeddings  -> OpenSearch
--   * raw analytics / xAPI / video heartbeats beyond 90 days -> ClickHouse
--   * media bytes, uploads, credential PDFs  -> object storage (rows hold keys)
--   * Laravel framework tables (sessions, cache, jobs, failed_jobs, pennant)
--
-- Conventions (spec section 11)
--   * id BIGINT UNSIGNED AUTO_INCREMENT on every table (internal joins).
--   * public_id CHAR(26) ULID on anything that appears in a URL or the API.
--   * tenant_id on every tenant-owned row; tenant 1 = the public platform.
--   * DATETIME in UTC; money DECIMAL(12,2) with an ISO-4217 currency column.
--   * Index names: ix_* (plain), uq_* (unique). Foreign keys are unnamed.
--   * Partitioned log tables (activity_events, evidence, ai_messages,
--     notification_deliveries, outbox_events) have NO foreign keys — InnoDB
--     doesn't allow them on partitioned tables; the app enforces integrity.
--
-- Keep in step with the spec: any change to what the platform stores updates
-- this file and database/README.md, and the file is re-loaded into an empty
-- database to prove it runs.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. Platform, tenants, localisation (spec section 17, section 7.5)
-- =============================================================================

CREATE TABLE countries (
  code             CHAR(2)     NOT NULL PRIMARY KEY,          -- ISO 3166-1
  name             VARCHAR(80) NOT NULL,
  currency         CHAR(3)     NOT NULL,                      -- ISO 4217
  default_locale   VARCHAR(10) NOT NULL,                      -- en-GH, fr-CI
  home_region      VARCHAR(20) NOT NULL,                      -- data-residency cluster: af-west, eu-west…
  price_book_id    BIGINT UNSIGNED NULL,
  mobile_money     BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tenants (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id        CHAR(26)     NOT NULL,
  kind             ENUM('platform','university','school','corporate','government','ngo','publisher') NOT NULL,
  name             VARCHAR(190) NOT NULL,
  slug             VARCHAR(80)  NOT NULL,
  country_code     CHAR(2)      NULL,
  home_region      VARCHAR(20)  NOT NULL DEFAULT 'af-west',
  -- Branding (spec section 17.2).
  logo_key         VARCHAR(255) NULL,
  brand_primary    CHAR(7)      NULL,
  brand_accent     CHAR(7)      NULL,
  -- Public academy (listed in the catalogue) or private (members only).
  visibility       ENUM('public','private') NOT NULL DEFAULT 'public',
  verified_at      DATETIME     NULL,
  ai_monthly_budget_usd DECIMAL(12,2) NULL,
  status           ENUM('active','suspended','pending','closed') NOT NULL DEFAULT 'pending',
  created_at       DATETIME NULL,
  updated_at       DATETIME NULL,
  UNIQUE KEY uq_tenants_public (public_id),
  UNIQUE KEY uq_tenants_slug (slug),
  FOREIGN KEY (country_code) REFERENCES countries (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tenant_domains (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  hostname     VARCHAR(190) NOT NULL,                         -- knust.open.classproject.com or learn.bank.com
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at  DATETIME NULL,
  tls_status   ENUM('pending','issued','failed') NOT NULL DEFAULT 'pending',
  UNIQUE KEY uq_tenant_domains_host (hostname),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-tenant settings that aren't worth a column (feature toggles, limits).
CREATE TABLE tenant_settings (
  tenant_id   BIGINT UNSIGNED NOT NULL,
  `key`       VARCHAR(80) NOT NULL,
  value       JSON NOT NULL,
  updated_at  DATETIME NULL,
  PRIMARY KEY (tenant_id, `key`),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sso_connections (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  protocol      ENUM('oidc','saml') NOT NULL,
  name          VARCHAR(120) NOT NULL,
  config        JSON NOT NULL,                                -- issuer, client id, metadata URL (secrets in the vault)
  email_domains JSON NULL,                                    -- auto-route sign-ins from these domains
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. Identity, roles, consent, learner profile (spec section 6.1, section 6.20, section 17.3)
-- =============================================================================

-- Users are global: one person, many tenant memberships.
CREATE TABLE users (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id          CHAR(26)     NOT NULL,
  handle             VARCHAR(40)  NULL,                       -- public portfolio /p/:handle
  display_name       VARCHAR(120) NOT NULL,
  email              VARCHAR(190) NULL,
  email_verified_at  DATETIME     NULL,
  phone              VARCHAR(20)  NULL,                       -- E.164
  phone_verified_at  DATETIME     NULL,
  password           VARCHAR(255) NULL,                       -- NULL for OTP/social-only accounts
  -- Date of birth drives the under-18 rules (D12). Encrypted at the app layer.
  birth_date_enc     VARBINARY(255) NULL,
  age_band           ENUM('under13','13_17','adult','unknown') NOT NULL DEFAULT 'unknown',
  country_code       CHAR(2)      NULL,
  home_region        VARCHAR(20)  NOT NULL DEFAULT 'af-west',
  locale             VARCHAR(10)  NOT NULL DEFAULT 'en',
  time_zone          VARCHAR(40)  NOT NULL DEFAULT 'Africa/Accra',
  mfa_secret_enc     VARBINARY(255) NULL,
  mfa_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  is_platform_staff  BOOLEAN NOT NULL DEFAULT FALSE,
  status             ENUM('active','restricted','suspended','deleted') NOT NULL DEFAULT 'active',
  last_seen_at       DATETIME NULL,
  deletion_requested_at DATETIME NULL,                        -- grace period before erasure (FR-LC-1)
  remember_token     VARCHAR(100) NULL,
  created_at         DATETIME NULL,
  updated_at         DATETIME NULL,
  UNIQUE KEY uq_users_public (public_id),
  UNIQUE KEY uq_users_handle (handle),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY ix_users_country (country_code),
  FOREIGN KEY (country_code) REFERENCES countries (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Social and SSO sign-ins linked to a user.
CREATE TABLE user_identities (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  provider       VARCHAR(40)  NOT NULL,                       -- google, apple, sso:<connection id>
  provider_uid   VARCHAR(190) NOT NULL,
  created_at     DATETIME NULL,
  UNIQUE KEY uq_user_identities (provider, provider_uid),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE webauthn_credentials (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  credential_id  VARBINARY(255) NOT NULL,
  public_key     BLOB NOT NULL,
  sign_count     INT UNSIGNED NOT NULL DEFAULT 0,
  label          VARCHAR(80) NULL,
  created_at     DATETIME NULL,
  last_used_at   DATETIME NULL,
  UNIQUE KEY uq_webauthn_credential (credential_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Guardian consent for 13–17-year-olds (FR-ID-4).
CREATE TABLE guardian_consents (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          BIGINT UNSIGNED NOT NULL,
  guardian_name    VARCHAR(120) NULL,
  guardian_contact_enc VARBINARY(255) NOT NULL,               -- phone or email, encrypted
  channel          ENUM('sms','email','whatsapp') NOT NULL,
  token_hash       CHAR(64) NOT NULL,
  status           ENUM('pending','granted','declined','revoked','expired') NOT NULL DEFAULT 'pending',
  scopes           JSON NOT NULL,                             -- ["community","live","ai_tutor"]
  requested_at     DATETIME NOT NULL,
  decided_at       DATETIME NULL,
  UNIQUE KEY uq_guardian_consents_token (token_hash),
  KEY ix_guardian_consents_user (user_id, status),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`     VARCHAR(80)  NOT NULL,
  label     VARCHAR(160) NOT NULL,
  UNIQUE KEY uq_permissions_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System roles (tenant_id NULL) plus roles a tenant defines for itself.
CREATE TABLE roles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT UNSIGNED NULL,
  `key`       VARCHAR(60)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  scope       ENUM('platform','tenant') NOT NULL,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_roles_tenant_key (tenant_id, `key`),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id)       REFERENCES roles (id)       ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A user's role in a tenant (learner, instructor, mentor, reviewer, admin…).
CREATE TABLE memberships (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  role_id     BIGINT UNSIGNED NOT NULL,
  status      ENUM('active','invited','suspended') NOT NULL DEFAULT 'active',
  external_id VARCHAR(120) NULL,                              -- SIS / HR id (OneRoster, SCIM)
  joined_at   DATETIME NOT NULL,
  UNIQUE KEY uq_memberships (tenant_id, user_id, role_id),
  KEY ix_memberships_user (user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
  FOREIGN KEY (role_id)   REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_groups (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(120) NOT NULL,
  external_id VARCHAR(120) NULL,                              -- SSO group / department
  created_at  DATETIME NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_group_members (
  group_id  BIGINT UNSIGNED NOT NULL,
  user_id   BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES user_groups (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users (id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every data-sharing or processing grant the learner gave, revocable (FR-LC-3).
CREATE TABLE consents (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  purpose      VARCHAR(60) NOT NULL,                          -- personalisation, ai_tutor, share_with_tenant, marketing…
  tenant_id    BIGINT UNSIGNED NULL,                          -- for share_with_tenant
  granted      BOOLEAN NOT NULL,
  policy_version VARCHAR(20) NOT NULL,
  decided_at   DATETIME NOT NULL,
  KEY ix_consents_user_purpose (user_id, purpose, decided_at),
  FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The rich learner profile (brief section 3). Competency levels live in skill_mastery.
CREATE TABLE learner_profiles (
  user_id              BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  headline             VARCHAR(160) NULL,
  job_title            VARCHAR(120) NULL,
  education_level      ENUM('primary','jhs','shs','diploma','bachelor','master','doctorate','other') NULL,
  hours_per_week       DECIMAL(4,1) NULL,
  preferred_days       JSON NULL,                             -- ["mon","wed","sat"]
  preferred_times      JSON NULL,
  learning_preferences JSON NULL,                             -- {"format":["video","text"],"pace":"steady"}
  device_profile       JSON NULL,                             -- {"type":"android","ram_gb":2,"storage_free_mb":900}
  connectivity         ENUM('offline_mostly','slow','moderate','fast') NULL,
  data_saver           BOOLEAN NOT NULL DEFAULT FALSE,
  accessibility_needs  JSON NULL,                             -- {"captions":true,"screen_reader":false,"extra_time":1.25}
  personalisation_on   BOOLEAN NOT NULL DEFAULT TRUE,
  ai_tutor_on          BOOLEAN NOT NULL DEFAULT TRUE,
  ai_practice_on       BOOLEAN NOT NULL DEFAULT TRUE,
  profile_public       BOOLEAN NOT NULL DEFAULT FALSE,
  streak_days          INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at           DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learner_languages (
  user_id      BIGINT UNSIGNED NOT NULL,
  language     VARCHAR(10) NOT NULL,                          -- BCP 47
  proficiency  ENUM('basic','conversational','fluent','native') NOT NULL,
  PRIMARY KEY (user_id, language),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Education and work history entries.
CREATE TABLE learner_history (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  kind         ENUM('education','work') NOT NULL,
  organisation VARCHAR(190) NOT NULL,
  title        VARCHAR(190) NULL,                             -- degree or job title
  start_date   DATE NULL,
  end_date     DATE NULL,
  description  TEXT NULL,
  KEY ix_learner_history_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Offline-sync devices (spec section 7.6).
CREATE TABLE devices (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  device_uid      CHAR(36) NOT NULL,
  platform        ENUM('web','android','ios') NOT NULL,
  label           VARCHAR(120) NULL,
  push_token      VARCHAR(255) NULL,
  last_synced_at  DATETIME NULL,
  created_at      DATETIME NULL,
  UNIQUE KEY uq_devices_uid (device_uid),
  KEY ix_devices_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. Competency graph: frameworks, competencies, skills, careers (spec section 15)
-- =============================================================================

CREATE TABLE frameworks (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id     CHAR(26) NOT NULL,
  tenant_id     BIGINT UNSIGNED NULL,                         -- NULL = platform framework
  kind          ENUM('platform','curriculum','industry','employer') NOT NULL,
  name          VARCHAR(190) NOT NULL,                        -- "Ghana SHS Curriculum (GES/NaCCA)"
  version       VARCHAR(20)  NOT NULL,
  case_uri      VARCHAR(255) NULL,                            -- CASE CFDocument URI when imported
  status        ENUM('draft','published','retired') NOT NULL DEFAULT 'draft',
  created_at    DATETIME NULL,
  updated_at    DATETIME NULL,
  UNIQUE KEY uq_frameworks_public (public_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The atomic unit of the learner graph. Skills are global and reused across frameworks.
CREATE TABLE skills (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(26) NOT NULL,
  slug            VARCHAR(120) NOT NULL,
  name            VARCHAR(190) NOT NULL,
  description     TEXT NULL,
  domain          VARCHAR(80)  NULL,                          -- mathematics, data, languages…
  -- Verified decays back to Applied after this many months without fresh evidence (spec section 14.4).
  refresh_months  SMALLINT UNSIGNED NULL,
  -- Knowledge-tracing parameters (BKT), tuned from data.
  bkt_prior       DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  bkt_learn       DECIMAL(5,4) NOT NULL DEFAULT 0.1500,
  bkt_slip        DECIMAL(5,4) NOT NULL DEFAULT 0.1000,
  bkt_guess       DECIMAL(5,4) NOT NULL DEFAULT 0.2000,
  esco_uri        VARCHAR(255) NULL,
  status          ENUM('draft','active','retired') NOT NULL DEFAULT 'active',
  created_at      DATETIME NULL,
  updated_at      DATETIME NULL,
  UNIQUE KEY uq_skills_public (public_id),
  UNIQUE KEY uq_skills_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prerequisite DAG.
CREATE TABLE skill_prerequisites (
  skill_id         BIGINT UNSIGNED NOT NULL,
  prerequisite_id  BIGINT UNSIGNED NOT NULL,
  strength         ENUM('required','helpful') NOT NULL DEFAULT 'required',
  PRIMARY KEY (skill_id, prerequisite_id),
  FOREIGN KEY (skill_id)        REFERENCES skills (id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE competencies (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id     CHAR(26) NOT NULL,
  framework_id  BIGINT UNSIGNED NOT NULL,
  parent_id     BIGINT UNSIGNED NULL,                         -- strands / sub-strands
  code          VARCHAR(40)  NULL,                            -- "B7.1.2.1" or "EMATH.ALG"
  name          VARCHAR(190) NOT NULL,
  description   TEXT NULL,
  position      INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_competencies_public (public_id),
  KEY ix_competencies_framework (framework_id, parent_id),
  FOREIGN KEY (framework_id) REFERENCES frameworks (id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id)    REFERENCES competencies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proficiency levels 1–5 with descriptors.
CREATE TABLE competency_levels (
  competency_id BIGINT UNSIGNED NOT NULL,
  level         TINYINT UNSIGNED NOT NULL,
  descriptor    TEXT NOT NULL,
  PRIMARY KEY (competency_id, level),
  FOREIGN KEY (competency_id) REFERENCES competencies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE competency_skills (
  competency_id BIGINT UNSIGNED NOT NULL,
  skill_id      BIGINT UNSIGNED NOT NULL,
  min_level     TINYINT UNSIGNED NOT NULL DEFAULT 1,           -- competency level this skill supports
  PRIMARY KEY (competency_id, skill_id),
  FOREIGN KEY (competency_id) REFERENCES competencies (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)      REFERENCES skills (id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE careers (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id    CHAR(26) NOT NULL,
  slug         VARCHAR(120) NOT NULL,
  name         VARCHAR(190) NOT NULL,                         -- "Data Analyst"
  description  TEXT NULL,
  onet_code    VARCHAR(20) NULL,
  isco_code    VARCHAR(10) NULL,
  status       ENUM('draft','published') NOT NULL DEFAULT 'draft',
  UNIQUE KEY uq_careers_public (public_id),
  UNIQUE KEY uq_careers_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE career_competencies (
  career_id     BIGINT UNSIGNED NOT NULL,
  competency_id BIGINT UNSIGNED NOT NULL,
  target_level  TINYINT UNSIGNED NOT NULL,
  importance    ENUM('core','supporting') NOT NULL DEFAULT 'core',
  PRIMARY KEY (career_id, competency_id),
  FOREIGN KEY (career_id)     REFERENCES careers (id)      ON DELETE CASCADE,
  FOREIGN KEY (competency_id) REFERENCES competencies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job-market skill signals mapped onto platform skills (spec section 28 of brief).
CREATE TABLE job_skills (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(190) NOT NULL,
  source      VARCHAR(60)  NOT NULL,                          -- job board / ESCO / partner
  demand_index DECIMAL(6,2) NULL,
  country_code CHAR(2) NULL,
  observed_on DATE NOT NULL,
  KEY ix_job_skills_name (name),
  FOREIGN KEY (country_code) REFERENCES countries (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE job_skill_mappings (
  job_skill_id BIGINT UNSIGNED NOT NULL,
  skill_id     BIGINT UNSIGNED NOT NULL,
  confidence   DECIMAL(4,3) NOT NULL,
  PRIMARY KEY (job_skill_id, skill_id),
  FOREIGN KEY (job_skill_id) REFERENCES job_skills (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)     REFERENCES skills (id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Learner goals ("become a data analyst", "pass WASSCE Elective Maths").
CREATE TABLE goals (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id     CHAR(26) NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  kind          ENUM('career','skill','competency','course','exam','curiosity') NOT NULL,
  statement     VARCHAR(255) NOT NULL,                        -- the learner's own words
  career_id     BIGINT UNSIGNED NULL,
  competency_id BIGINT UNSIGNED NULL,
  deadline      DATE NULL,
  status        ENUM('active','achieved','paused','abandoned') NOT NULL DEFAULT 'active',
  achieved_at   DATETIME NULL,
  outcome_rating TINYINT UNSIGNED NULL,                       -- "this helped me achieve my goal" 1–5 (LEI)
  created_at    DATETIME NULL,
  updated_at    DATETIME NULL,
  UNIQUE KEY uq_goals_public (public_id),
  KEY ix_goals_user (user_id, status),
  FOREIGN KEY (user_id)       REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (career_id)     REFERENCES careers (id),
  FOREIGN KEY (competency_id) REFERENCES competencies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE goal_skills (
  goal_id   BIGINT UNSIGNED NOT NULL,
  skill_id  BIGINT UNSIGNED NOT NULL,
  target_state ENUM('understood','applied','verified') NOT NULL DEFAULT 'applied',
  PRIMARY KEY (goal_id, skill_id),
  FOREIGN KEY (goal_id)  REFERENCES goals (id)  ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. Catalogue & authoring: courses, versions, structure, media (spec section 6.5, section 6.17)
-- =============================================================================

CREATE TABLE instructor_profiles (
  user_id          BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  bio              TEXT NULL,
  expertise        JSON NULL,
  website          VARCHAR(255) NULL,
  verification     ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  verified_at      DATETIME NULL,
  verified_by      BIGINT UNSIGNED NULL,
  FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A course is the stable identity; its content lives in versions.
CREATE TABLE courses (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id           CHAR(26) NOT NULL,
  tenant_id           BIGINT UNSIGNED NOT NULL,
  slug                VARCHAR(160) NOT NULL,
  title               VARCHAR(190) NOT NULL,
  subtitle            VARCHAR(255) NULL,
  level               ENUM('beginner','intermediate','advanced') NOT NULL,
  primary_language    VARCHAR(10) NOT NULL DEFAULT 'en',
  -- Audience: ages and whether it suits secondary students (ClassProject link, spec section 25.4).
  min_age             TINYINT UNSIGNED NOT NULL DEFAULT 13,
  secondary_friendly  BOOLEAN NOT NULL DEFAULT FALSE,
  exam_alignment      VARCHAR(40) NULL,                       -- WASSCE, BECE, IGCSE…
  pricing             ENUM('free','premium','subscription','institution') NOT NULL DEFAULT 'free',
  licence             VARCHAR(40) NOT NULL DEFAULT 'all-rights-reserved', -- or CC-BY-4.0…
  offline_available   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Cover image (FR-TR-3): an uploaded 16:9 WebP (≤ 25 KB). NULL = the generated SVG cover is used.
  thumbnail_media_id  BIGINT UNSIGNED NULL,
  thumbnail_alt       VARCHAR(255) NULL,
  current_version_id  BIGINT UNSIGNED NULL,
  -- Denormalised quality signals for ranking (recomputed nightly, spec section 6.15 FR-TR-2).
  quality_score       DECIMAL(5,2) NULL,
  mastery_rate        DECIMAL(5,2) NULL,
  learners_count      INT UNSIGNED NOT NULL DEFAULT 0,
  status              ENUM('draft','in_review','published','unlisted','retired') NOT NULL DEFAULT 'draft',
  published_at        DATETIME NULL,
  created_at          DATETIME NULL,
  updated_at          DATETIME NULL,
  UNIQUE KEY uq_courses_public (public_id),
  UNIQUE KEY uq_courses_tenant_slug (tenant_id, slug),
  KEY ix_courses_status (status, pricing, secondary_friendly),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_instructors (
  course_id  BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  role       ENUM('lead','instructor','ta','reviewer') NOT NULL DEFAULT 'instructor',
  revenue_share_pct DECIMAL(5,2) NULL,
  PRIMARY KEY (course_id, user_id),
  FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A published snapshot of the course. Learners stay on their version (FR-CA-4).
CREATE TABLE course_versions (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id         BIGINT UNSIGNED NOT NULL,
  version           VARCHAR(20) NOT NULL,                     -- semver-ish: 1.4.0
  description       MEDIUMTEXT NULL,
  -- Transparency block (FR-TR-1).
  workload_hours    DECIMAL(6,1) NULL,
  weeks             SMALLINT UNSIGNED NULL,
  prerequisites_text TEXT NULL,
  assessment_methods JSON NULL,
  accessibility     JSON NULL,                                -- {"captions":true,"transcripts":true,"screen_reader_tested":"2026-09-01"}
  download_size_mb  INT UNSIGNED NULL,
  change_notes      TEXT NULL,
  safe_to_migrate   BOOLEAN NOT NULL DEFAULT FALSE,
  status            ENUM('draft','in_review','published','superseded') NOT NULL DEFAULT 'draft',
  published_at      DATETIME NULL,
  created_by        BIGINT UNSIGNED NULL,
  created_at        DATETIME NULL,
  UNIQUE KEY uq_course_versions (course_id, version),
  FOREIGN KEY (course_id)  REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_languages (
  course_version_id BIGINT UNSIGNED NOT NULL,
  language          VARCHAR(10) NOT NULL,
  kind              ENUM('audio','subtitles','interface') NOT NULL,
  PRIMARY KEY (course_version_id, language, kind),
  FOREIGN KEY (course_version_id) REFERENCES course_versions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_prerequisite_skills (
  course_version_id BIGINT UNSIGNED NOT NULL,
  skill_id          BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (course_version_id, skill_id),
  FOREIGN KEY (course_version_id) REFERENCES course_versions (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)          REFERENCES skills (id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Instructor-written objectives; every activity serves ≥1, every objective maps to skills + items.
CREATE TABLE objectives (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_version_id BIGINT UNSIGNED NOT NULL,
  position          INT UNSIGNED NOT NULL,
  statement         VARCHAR(500) NOT NULL,                    -- "Learners can write SQL joins across three tables"
  bloom_level       ENUM('remember','understand','apply','analyse','evaluate','create') NOT NULL,
  KEY ix_objectives_version (course_version_id, position),
  FOREIGN KEY (course_version_id) REFERENCES course_versions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE objective_skills (
  objective_id BIGINT UNSIGNED NOT NULL,
  skill_id     BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (objective_id, skill_id),
  FOREIGN KEY (objective_id) REFERENCES objectives (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)     REFERENCES skills (id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_modules (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_version_id BIGINT UNSIGNED NOT NULL,
  position          INT UNSIGNED NOT NULL,
  title             VARCHAR(190) NOT NULL,
  summary           TEXT NULL,
  KEY ix_course_modules_version (course_version_id, position),
  FOREIGN KEY (course_version_id) REFERENCES course_versions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lessons (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id   CHAR(26) NOT NULL,
  module_id   BIGINT UNSIGNED NOT NULL,
  position    INT UNSIGNED NOT NULL,
  title       VARCHAR(190) NOT NULL,
  summary     TEXT NULL,
  minutes     SMALLINT UNSIGNED NULL,
  UNIQUE KEY uq_lessons_public (public_id),
  KEY ix_lessons_module (module_id, position),
  FOREIGN KEY (module_id) REFERENCES course_modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Named ideas taught in a lesson: used for search, spaced review, "where this fits".
CREATE TABLE concepts (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lesson_id  BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(190) NOT NULL,
  summary    TEXT NULL,
  skill_id   BIGINT UNSIGNED NULL,
  KEY ix_concepts_lesson (lesson_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)  REFERENCES skills (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Media are stored once and referenced by activities (spec section 13).
CREATE TABLE media_assets (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(26) NOT NULL,
  tenant_id       BIGINT UNSIGNED NOT NULL,
  kind            ENUM('video','audio','image','document','slides','package','transcript','caption','other') NOT NULL,
  storage_key     VARCHAR(500) NOT NULL,                      -- original in object storage
  mime_type       VARCHAR(120) NOT NULL,
  size_bytes      BIGINT UNSIGNED NOT NULL,
  duration_seconds INT UNSIGNED NULL,
  -- Video pipeline output (HLS/CMAF) and its state.
  playback_id     VARCHAR(120) NULL,
  renditions      JSON NULL,                                  -- [{"height":144,"kbps":110,"bytes":…},…,{"audio_only":true}]
  processing      ENUM('uploaded','processing','ready','failed') NOT NULL DEFAULT 'uploaded',
  alt_text        VARCHAR(500) NULL,
  uploaded_by     BIGINT UNSIGNED NULL,
  created_at      DATETIME NULL,
  UNIQUE KEY uq_media_assets_public (public_id),
  KEY ix_media_assets_tenant (tenant_id, kind),
  FOREIGN KEY (tenant_id)   REFERENCES tenants (id),
  FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Captions/subtitles per language; human review before learners see auto captions.
CREATE TABLE media_captions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  media_id      BIGINT UNSIGNED NOT NULL,
  language      VARCHAR(10) NOT NULL,
  storage_key   VARCHAR(500) NOT NULL,                        -- WebVTT
  source        ENUM('human','auto','auto_reviewed','translated') NOT NULL,
  reviewed_by   BIGINT UNSIGNED NULL,
  reviewed_at   DATETIME NULL,
  UNIQUE KEY uq_media_captions (media_id, language),
  FOREIGN KEY (media_id)    REFERENCES media_assets (id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users (id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media_chapters (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  media_id    BIGINT UNSIGNED NOT NULL,
  starts_at_s INT UNSIGNED NOT NULL,
  title       VARCHAR(190) NOT NULL,
  KEY ix_media_chapters (media_id, starts_at_s),
  FOREIGN KEY (media_id) REFERENCES media_assets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every learner-facing unit (FR-CA-2). Kind-specific settings are JSON.
CREATE TABLE activities (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(26) NOT NULL,
  lesson_id       BIGINT UNSIGNED NOT NULL,
  position        INT UNSIGNED NOT NULL,
  kind            ENUM('video','interactive_video','text','audio','slides','diagram','simulation','coding','lab','case_study','scenario','project','discussion','peer_review','ai_tutoring','live','assignment','quiz','exam','reflection','research','scorm','cmi5','lti','flashcards') NOT NULL,
  title           VARCHAR(190) NOT NULL,
  body            MEDIUMTEXT NULL,                            -- text / reading content (Markdown)
  media_id        BIGINT UNSIGNED NULL,
  assessment_id   BIGINT UNSIGNED NULL,
  project_id      BIGINT UNSIGNED NULL,
  live_session_id BIGINT UNSIGNED NULL,
  lti_link_id     BIGINT UNSIGNED NULL,
  settings        JSON NULL,                                  -- kind-specific (e.g. coding language, lab image)
  minutes         SMALLINT UNSIGNED NULL,
  offline_ok      BOOLEAN NOT NULL DEFAULT TRUE,
  required        BOOLEAN NOT NULL DEFAULT TRUE,
  -- Provenance when drafted by AI Studio (FR-ST-3).
  ai_draft_id     BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_activities_public (public_id),
  KEY ix_activities_lesson (lesson_id, position),
  FOREIGN KEY (lesson_id) REFERENCES lessons (id)      ON DELETE CASCADE,
  FOREIGN KEY (media_id)  REFERENCES media_assets (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_objectives (
  activity_id  BIGINT UNSIGNED NOT NULL,
  objective_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (activity_id, objective_id),
  FOREIGN KEY (activity_id)  REFERENCES activities (id) ON DELETE CASCADE,
  FOREIGN KEY (objective_id) REFERENCES objectives (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Questions shown inside a video at a timestamp (FR-VP-4).
CREATE TABLE video_questions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activity_id BIGINT UNSIGNED NOT NULL,
  at_second   INT UNSIGNED NOT NULL,
  item_id     BIGINT UNSIGNED NOT NULL,
  must_answer BOOLEAN NOT NULL DEFAULT FALSE,
  KEY ix_video_questions (activity_id, at_second),
  FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content review workflow (FR-MK-3) and quality scoring (FR-QA-1).
CREATE TABLE course_reviews (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_version_id BIGINT UNSIGNED NOT NULL,
  reviewer_id       BIGINT UNSIGNED NULL,
  status            ENUM('queued','in_progress','approved','changes_requested','rejected') NOT NULL DEFAULT 'queued',
  scores            JSON NULL,                                -- rubric: objectives, design, accuracy, currency, accessibility, assessment…
  notes             TEXT NULL,
  submitted_at      DATETIME NOT NULL,
  decided_at        DATETIME NULL,
  KEY ix_course_reviews_status (status, submitted_at),
  FOREIGN KEY (course_version_id) REFERENCES course_versions (id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id)       REFERENCES users (id)           ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Human-review queue for anything automated monitoring notices (FR-QA-3). AI never edits content.
CREATE TABLE quality_flags (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  course_id     BIGINT UNSIGNED NOT NULL,
  target_type   ENUM('course','activity','item','media','link','discussion') NOT NULL,
  target_id     BIGINT UNSIGNED NOT NULL,
  kind          ENUM('outdated','broken_link','suspect_answer','ambiguous_item','duplicate','copyright','accessibility','poor_explanation','learner_confusion','low_performance') NOT NULL,
  source        ENUM('ai','psychometrics','learner_report','reviewer','system') NOT NULL,
  detail        TEXT NULL,
  evidence      JSON NULL,
  status        ENUM('open','acknowledged','fixed','dismissed') NOT NULL DEFAULT 'open',
  assigned_to   BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL,
  resolved_at   DATETIME NULL,
  resolved_by   BIGINT UNSIGNED NULL,
  KEY ix_quality_flags_course (course_id, status),
  FOREIGN KEY (tenant_id)   REFERENCES tenants (id),
  FOREIGN KEY (course_id)   REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users (id)   ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tags (topics) for discovery and partner matching.
CREATE TABLE topics (
  id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug  VARCHAR(120) NOT NULL,
  name  VARCHAR(190) NOT NULL,
  UNIQUE KEY uq_topics_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_topics (
  course_id BIGINT UNSIGNED NOT NULL,
  topic_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (course_id, topic_id),
  FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id)  REFERENCES topics (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. Programs and learning paths (spec section 6.4)
-- =============================================================================

-- Academic programmes / professional certificates made of several courses.
CREATE TABLE programs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id   CHAR(26) NOT NULL,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  kind        ENUM('professional_certificate','microcredential','academic','continuing_ed') NOT NULL,
  slug        VARCHAR(160) NOT NULL,
  title       VARCHAR(190) NOT NULL,
  description TEXT NULL,
  status      ENUM('draft','published','retired') NOT NULL DEFAULT 'draft',
  created_at  DATETIME NULL,
  UNIQUE KEY uq_programs_public (public_id),
  UNIQUE KEY uq_programs_slug (tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Curated paths (course / skill / career) and personal paths generated for one learner.
CREATE TABLE paths (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id    CHAR(26) NOT NULL,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  kind         ENUM('course','skill','career','personal') NOT NULL,
  title        VARCHAR(190) NOT NULL,
  description  TEXT NULL,
  program_id   BIGINT UNSIGNED NULL,
  career_id    BIGINT UNSIGNED NULL,
  owner_user_id BIGINT UNSIGNED NULL,                         -- personal paths only
  goal_id      BIGINT UNSIGNED NULL,
  status       ENUM('draft','published','active','archived') NOT NULL DEFAULT 'draft',
  created_at   DATETIME NULL,
  updated_at   DATETIME NULL,
  UNIQUE KEY uq_paths_public (public_id),
  KEY ix_paths_owner (owner_user_id),
  FOREIGN KEY (tenant_id)     REFERENCES tenants (id),
  FOREIGN KEY (program_id)    REFERENCES programs (id) ON DELETE SET NULL,
  FOREIGN KEY (career_id)     REFERENCES careers (id)  ON DELETE SET NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users (id)    ON DELETE CASCADE,
  FOREIGN KEY (goal_id)       REFERENCES goals (id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE path_steps (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  path_id     BIGINT UNSIGNED NOT NULL,
  position    INT UNSIGNED NOT NULL,
  kind        ENUM('course','module','activity','skill','project','assessment','credential') NOT NULL,
  course_id   BIGINT UNSIGNED NULL,
  skill_id    BIGINT UNSIGNED NULL,
  ref_id      BIGINT UNSIGNED NULL,                           -- module / activity / project / assessment / credential definition
  optional    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Why this step is in a personal path (P2: every recommendation explains itself).
  reason      VARCHAR(255) NULL,
  skipped_by_diagnostic BOOLEAN NOT NULL DEFAULT FALSE,
  KEY ix_path_steps (path_id, position),
  FOREIGN KEY (path_id)   REFERENCES paths (id)   ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)  REFERENCES skills (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. Enrolment, progress, planner, notes, spaced review (spec section 6.4, section 6.9, section 7.6)
-- =============================================================================

CREATE TABLE enrollments (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT UNSIGNED NOT NULL,
  user_id            BIGINT UNSIGNED NOT NULL,
  course_id          BIGINT UNSIGNED NOT NULL,
  course_version_id  BIGINT UNSIGNED NOT NULL,                -- learner stays on this version
  cohort_id          BIGINT UNSIGNED NULL,
  source             ENUM('self','assigned','cohort','partner_referral','purchase','subscription') NOT NULL DEFAULT 'self',
  assigned_by        BIGINT UNSIGNED NULL,
  due_date           DATE NULL,
  track              ENUM('audit','full','verified') NOT NULL DEFAULT 'full',
  status             ENUM('active','completed','dropped','expired') NOT NULL DEFAULT 'active',
  progress_pct       DECIMAL(5,2) NOT NULL DEFAULT 0,        -- activities done
  mastery_pct        DECIMAL(5,2) NOT NULL DEFAULT 0,        -- course skills at Understood or better
  last_activity_id   BIGINT UNSIGNED NULL,
  last_activity_at   DATETIME NULL,
  enrolled_at        DATETIME NOT NULL,
  completed_at       DATETIME NULL,
  UNIQUE KEY uq_enrollments (user_id, course_id),
  KEY ix_enrollments_course (course_id, status),
  KEY ix_enrollments_tenant (tenant_id),
  FOREIGN KEY (tenant_id)         REFERENCES tenants (id),
  FOREIGN KEY (user_id)           REFERENCES users (id)           ON DELETE CASCADE,
  FOREIGN KEY (course_id)         REFERENCES courses (id),
  FOREIGN KEY (course_version_id) REFERENCES course_versions (id),
  FOREIGN KEY (assigned_by)       REFERENCES users (id)           ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE path_enrollments (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  path_id      BIGINT UNSIGNED NOT NULL,
  goal_id      BIGINT UNSIGNED NULL,
  current_step_id BIGINT UNSIGNED NULL,
  status       ENUM('active','completed','paused','dropped') NOT NULL DEFAULT 'active',
  started_at   DATETIME NOT NULL,
  completed_at DATETIME NULL,
  UNIQUE KEY uq_path_enrollments (user_id, path_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (path_id) REFERENCES paths (id) ON DELETE CASCADE,
  FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Current state per learner × activity (the hot aggregate; raw events are in activity_events).
CREATE TABLE activity_progress (
  user_id        BIGINT UNSIGNED NOT NULL,
  activity_id    BIGINT UNSIGNED NOT NULL,
  status         ENUM('not_started','in_progress','completed','skipped_tested_out') NOT NULL DEFAULT 'not_started',
  position_s     INT UNSIGNED NULL,                           -- resume point for media
  watched_pct    DECIMAL(5,2) NULL,
  time_spent_s   INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at   DATETIME NULL,
  updated_at     DATETIME NOT NULL,
  PRIMARY KEY (user_id, activity_id),
  KEY ix_activity_progress_activity (activity_id, status),
  FOREIGN KEY (user_id)     REFERENCES users (id)      ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Raw learning events (append-only, partitioned by month; archived to ClickHouse).
-- client_event_id makes offline sync idempotent (spec section 7.6). No FKs (partitioned).
CREATE TABLE activity_events (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  occurred_at      DATETIME NOT NULL,
  received_at      DATETIME NOT NULL,
  tenant_id        BIGINT UNSIGNED NOT NULL,
  user_id          BIGINT UNSIGNED NOT NULL,
  activity_id      BIGINT UNSIGNED NULL,
  course_id        BIGINT UNSIGNED NULL,
  device_id        BIGINT UNSIGNED NULL,
  client_event_id  CHAR(36) NULL,
  verb             VARCHAR(40) NOT NULL,                      -- started, progressed, completed, answered, bookmarked…
  payload          JSON NULL,
  PRIMARY KEY (id, occurred_at),
  UNIQUE KEY uq_activity_events_client (client_event_id, occurred_at),
  KEY ix_activity_events_user (user_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE COLUMNS (occurred_at) (
  PARTITION p2026_09 VALUES LESS THAN ('2026-10-01'),
  PARTITION p2026_10 VALUES LESS THAN ('2026-11-01'),
  PARTITION p2026_11 VALUES LESS THAN ('2026-12-01'),
  PARTITION pmax     VALUES LESS THAN (MAXVALUE)
);

-- Offline sync batches received from devices.
CREATE TABLE sync_batches (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id    BIGINT UNSIGNED NOT NULL,
  batch_uid    CHAR(36) NOT NULL,
  events_count INT UNSIGNED NOT NULL,
  applied      INT UNSIGNED NOT NULL DEFAULT 0,
  rejected     INT UNSIGNED NOT NULL DEFAULT 0,
  received_at  DATETIME NOT NULL,
  UNIQUE KEY uq_sync_batches_uid (batch_uid),
  FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notes (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  activity_id BIGINT UNSIGNED NOT NULL,
  at_second   INT UNSIGNED NULL,                              -- time-stamped video notes
  body        TEXT NOT NULL,
  client_uid  CHAR(36) NULL,
  created_at  DATETIME NOT NULL,
  updated_at  DATETIME NOT NULL,
  KEY ix_notes_user_activity (user_id, activity_id),
  UNIQUE KEY uq_notes_client (client_uid),
  FOREIGN KEY (user_id)     REFERENCES users (id)      ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookmarks (
  user_id     BIGINT UNSIGNED NOT NULL,
  activity_id BIGINT UNSIGNED NOT NULL,
  at_second   INT UNSIGNED NOT NULL DEFAULT 0,
  label       VARCHAR(190) NULL,
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (user_id, activity_id, at_second),
  FOREIGN KEY (user_id)     REFERENCES users (id)      ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The planner (FR-LP-4): a learner's plan and its scheduled sessions; re-flowed when behind.
CREATE TABLE study_plans (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  goal_id         BIGINT UNSIGNED NULL,
  path_enrollment_id BIGINT UNSIGNED NULL,
  deadline        DATE NULL,
  hours_per_week  DECIMAL(4,1) NOT NULL,
  preferred_days  JSON NOT NULL,
  projected_finish DATE NULL,
  last_reflowed_at DATETIME NULL,
  reflow_note     VARCHAR(255) NULL,                          -- "New finish 12 Mar, or add 1 h/week to keep 28 Feb"
  status          ENUM('active','paused','done') NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL,
  FOREIGN KEY (user_id)            REFERENCES users (id)            ON DELETE CASCADE,
  FOREIGN KEY (goal_id)            REFERENCES goals (id)            ON DELETE SET NULL,
  FOREIGN KEY (path_enrollment_id) REFERENCES path_enrollments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_sessions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id       BIGINT UNSIGNED NOT NULL,
  starts_at     DATETIME NOT NULL,
  minutes       SMALLINT UNSIGNED NOT NULL,
  planned_items JSON NOT NULL,                                -- activity / review item ids
  status        ENUM('planned','done','missed','moved') NOT NULL DEFAULT 'planned',
  KEY ix_study_sessions_plan (plan_id, starts_at),
  FOREIGN KEY (plan_id) REFERENCES study_plans (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Spaced-repetition cards per learner (FSRS-style scheduling, FR-RT-1).
CREATE TABLE review_items (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  skill_id      BIGINT UNSIGNED NOT NULL,
  item_id       BIGINT UNSIGNED NULL,                         -- a bank item, or a flashcard
  concept_id    BIGINT UNSIGNED NULL,
  stability     DECIMAL(10,4) NOT NULL DEFAULT 0,
  difficulty    DECIMAL(6,4) NOT NULL DEFAULT 5,
  due_at        DATETIME NOT NULL,
  last_review_at DATETIME NULL,
  reps          INT UNSIGNED NOT NULL DEFAULT 0,
  lapses        INT UNSIGNED NOT NULL DEFAULT 0,
  suspended     BOOLEAN NOT NULL DEFAULT FALSE,
  KEY ix_review_items_due (user_id, due_at),
  FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE,
  FOREIGN KEY (skill_id)   REFERENCES skills (id)   ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. Mastery and evidence — the learner competency graph (spec section 14.4, section 15)
-- =============================================================================

CREATE TABLE skill_mastery (
  user_id         BIGINT UNSIGNED NOT NULL,
  skill_id        BIGINT UNSIGNED NOT NULL,
  p_mastery       DECIMAL(5,4) NOT NULL DEFAULT 0,             -- BKT estimate
  confidence      DECIMAL(5,4) NOT NULL DEFAULT 0,
  state           ENUM('not_started','exposed','understood','applied','verified') NOT NULL DEFAULT 'not_started',
  evidence_count  INT UNSIGNED NOT NULL DEFAULT 0,
  last_evidence_at DATETIME NULL,
  verified_until  DATE NULL,                                   -- decays after skills.refresh_months
  updated_at      DATETIME NOT NULL,
  PRIMARY KEY (user_id, skill_id),
  KEY ix_skill_mastery_skill_state (skill_id, state),
  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every observation that moved (or could move) a mastery estimate. Partitioned; no FKs.
CREATE TABLE evidence (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  observed_at   DATETIME NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  skill_id      BIGINT UNSIGNED NOT NULL,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  source        ENUM('exposure','ai_practice','practice','quiz','video_question','lab','coding','project_peer','project_instructor','credential_assessment','live_poll','diagnostic','test_out') NOT NULL,
  weight        DECIMAL(4,3) NOT NULL,                        -- spec section 15.3
  outcome       DECIMAL(5,4) NOT NULL,                        -- 0–1 correctness / rubric fraction
  ref_type      VARCHAR(30) NOT NULL,                         -- item_response, rubric_score, activity…
  ref_id        BIGINT UNSIGNED NOT NULL,
  p_before      DECIMAL(5,4) NULL,
  p_after       DECIMAL(5,4) NULL,
  disputed      BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id, observed_at),
  KEY ix_evidence_user_skill (user_id, skill_id, observed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE COLUMNS (observed_at) (
  PARTITION p2026_09 VALUES LESS THAN ('2026-10-01'),
  PARTITION p2026_10 VALUES LESS THAN ('2026-11-01'),
  PARTITION p2026_11 VALUES LESS THAN ('2026-12-01'),
  PARTITION pmax     VALUES LESS THAN (MAXVALUE)
);

-- Diagnostics per goal (FR-DG-1..3).
CREATE TABLE diagnostics (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  goal_id        BIGINT UNSIGNED NULL,
  course_id      BIGINT UNSIGNED NULL,                        -- test-out / readiness check
  kind           ENUM('goal','readiness','test_out') NOT NULL,
  attempt_id     BIGINT UNSIGNED NULL,
  result         JSON NULL,                                   -- per-skill known / partial / gap + confidence
  started_at     DATETIME NOT NULL,
  completed_at   DATETIME NULL,
  FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
  FOREIGN KEY (goal_id)   REFERENCES goals (id)   ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. Assessment engine (spec section 6.10, section 14)
-- =============================================================================

-- Item bank: versioned questions reusable across assessments.
CREATE TABLE items (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(26) NOT NULL,
  tenant_id       BIGINT UNSIGNED NOT NULL,
  course_id       BIGINT UNSIGNED NULL,                        -- NULL = tenant-wide bank
  version         INT UNSIGNED NOT NULL DEFAULT 1,
  supersedes_id   BIGINT UNSIGNED NULL,
  type            ENUM('mcq','multi_response','true_false','matching','ordering','fill_blank','numeric','short_answer','essay','coding','file','project','oral','video','practical','simulation') NOT NULL,
  stem            MEDIUMTEXT NOT NULL,
  content         JSON NOT NULL,                              -- options, pairs, blanks, test cases, rubric ref… (QTI-mappable)
  answer_key      JSON NULL,                                  -- never sent to clients during attempts
  bloom_level     ENUM('remember','understand','apply','analyse','evaluate','create') NOT NULL,
  difficulty      DECIMAL(5,3) NULL,                          -- instructor estimate, then IRT b
  discrimination  DECIMAL(5,3) NULL,                          -- IRT a / point-biserial
  expected_seconds SMALLINT UNSIGNED NULL,
  rubric_id       BIGINT UNSIGNED NULL,
  origin          ENUM('human','ai_draft_approved','imported_qti') NOT NULL DEFAULT 'human',
  status          ENUM('draft','active','retired') NOT NULL DEFAULT 'draft',
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME NULL,
  UNIQUE KEY uq_items_public (public_id),
  KEY ix_items_course (course_id, status),
  FOREIGN KEY (tenant_id)     REFERENCES tenants (id),
  FOREIGN KEY (course_id)     REFERENCES courses (id) ON DELETE SET NULL,
  FOREIGN KEY (supersedes_id) REFERENCES items (id)   ON DELETE SET NULL,
  FOREIGN KEY (created_by)    REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE item_skills (
  item_id   BIGINT UNSIGNED NOT NULL,
  skill_id  BIGINT UNSIGNED NOT NULL,
  objective_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (item_id, skill_id),
  FOREIGN KEY (item_id)      REFERENCES items (id)      ON DELETE CASCADE,
  FOREIGN KEY (skill_id)     REFERENCES skills (id)     ON DELETE CASCADE,
  FOREIGN KEY (objective_id) REFERENCES objectives (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nightly psychometrics (spec section 14.3).
CREATE TABLE item_statistics (
  item_id          BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  responses        INT UNSIGNED NOT NULL,
  p_value          DECIMAL(5,4) NULL,
  point_biserial   DECIMAL(5,4) NULL,
  irt_a            DECIMAL(6,3) NULL,
  irt_b            DECIMAL(6,3) NULL,
  median_seconds   INT UNSIGNED NULL,
  distractors      JSON NULL,
  computed_at      DATETIME NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rubrics (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(190) NOT NULL,
  created_by  BIGINT UNSIGNED NULL,
  created_at  DATETIME NULL,
  FOREIGN KEY (tenant_id)  REFERENCES tenants (id),
  FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rubric_criteria (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rubric_id   BIGINT UNSIGNED NOT NULL,
  position    INT UNSIGNED NOT NULL,
  title       VARCHAR(190) NOT NULL,
  description TEXT NULL,
  max_points  DECIMAL(6,2) NOT NULL,
  skill_id    BIGINT UNSIGNED NULL,                           -- criterion evidence goes to this skill
  levels      JSON NOT NULL,                                  -- [{"points":4,"label":"Exemplary","descriptor":"…"},…]
  KEY ix_rubric_criteria (rubric_id, position),
  FOREIGN KEY (rubric_id) REFERENCES rubrics (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)  REFERENCES skills (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A blueprint: fixed items, random pools, or adaptive (CAT).
CREATE TABLE assessments (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id        CHAR(26) NOT NULL,
  tenant_id        BIGINT UNSIGNED NOT NULL,
  course_id        BIGINT UNSIGNED NULL,
  title            VARCHAR(190) NOT NULL,
  purpose          ENUM('practice','formative','summative','diagnostic','credential','test_out') NOT NULL,
  mode             ENUM('fixed','pooled','adaptive') NOT NULL DEFAULT 'fixed',
  blueprint        JSON NULL,                                 -- pools: [{"skill":…, "count":3, "difficulty":[…]}]; CAT stop rules
  time_limit_min   SMALLINT UNSIGNED NULL,
  attempts_allowed SMALLINT UNSIGNED NULL,
  pass_mark_pct    DECIMAL(5,2) NULL,
  shuffle          BOOLEAN NOT NULL DEFAULT TRUE,
  offline_ok       BOOLEAN NOT NULL DEFAULT FALSE,
  proctoring       ENUM('none','lockdown','remote_ai_flagging','live') NOT NULL DEFAULT 'none',
  opens_at         DATETIME NULL,
  closes_at        DATETIME NULL,
  status           ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
  created_at       DATETIME NULL,
  UNIQUE KEY uq_assessments_public (public_id),
  KEY ix_assessments_course (course_id, status),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_items (
  assessment_id BIGINT UNSIGNED NOT NULL,
  item_id       BIGINT UNSIGNED NOT NULL,
  position      INT UNSIGNED NOT NULL,
  points        DECIMAL(6,2) NOT NULL,
  PRIMARY KEY (assessment_id, item_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)       REFERENCES items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-learner adjustments (extra time etc., FR-AS-7).
CREATE TABLE accommodations (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  tenant_id       BIGINT UNSIGNED NULL,
  time_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  alternatives    JSON NULL,                                  -- {"no_drag_drop":true,"screen_reader":true}
  approved_by     BIGINT UNSIGNED NULL,
  valid_until     DATE NULL,
  FOREIGN KEY (user_id)     REFERENCES users (id)   ON DELETE CASCADE,
  FOREIGN KEY (tenant_id)   REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempts (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id        CHAR(26) NOT NULL,
  tenant_id        BIGINT UNSIGNED NOT NULL,
  assessment_id    BIGINT UNSIGNED NOT NULL,
  user_id          BIGINT UNSIGNED NOT NULL,
  number           SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  form_seed        INT UNSIGNED NULL,                         -- randomisation seed
  started_at       DATETIME NOT NULL,
  submitted_at     DATETIME NULL,
  offline          BOOLEAN NOT NULL DEFAULT FALSE,
  score_points     DECIMAL(8,2) NULL,
  score_pct        DECIMAL(5,2) NULL,
  passed           BOOLEAN NULL,
  -- AI-proposed vs. human-final grading (FR-AS-5): credential-bearing grades need a human.
  graded_by        BIGINT UNSIGNED NULL,
  graded_at        DATETIME NULL,
  status           ENUM('in_progress','submitted','grading','graded','invalidated') NOT NULL DEFAULT 'in_progress',
  integrity_flags  JSON NULL,                                 -- advisory only, never auto-fail
  UNIQUE KEY uq_attempts_public (public_id),
  UNIQUE KEY uq_attempts_number (assessment_id, user_id, number),
  KEY ix_attempts_user (user_id, submitted_at),
  FOREIGN KEY (tenant_id)     REFERENCES tenants (id),
  FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)       REFERENCES users (id)       ON DELETE CASCADE,
  FOREIGN KEY (graded_by)     REFERENCES users (id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE item_responses (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attempt_id     BIGINT UNSIGNED NOT NULL,
  item_id        BIGINT UNSIGNED NOT NULL,
  response       JSON NULL,
  media_id       BIGINT UNSIGNED NULL,                        -- file / audio / video answers
  auto_score     DECIMAL(6,2) NULL,
  ai_proposed_score DECIMAL(6,2) NULL,
  ai_rationale   TEXT NULL,
  final_score    DECIMAL(6,2) NULL,
  feedback       TEXT NULL,
  hints_used     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  seconds_spent  INT UNSIGNED NULL,
  answered_at    DATETIME NULL,
  UNIQUE KEY uq_item_responses (attempt_id, item_id),
  KEY ix_item_responses_item (item_id),
  FOREIGN KEY (attempt_id) REFERENCES attempts (id)     ON DELETE CASCADE,
  FOREIGN KEY (item_id)    REFERENCES items (id),
  FOREIGN KEY (media_id)   REFERENCES media_assets (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Code runs in the sandbox (coding items).
CREATE TABLE code_runs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  response_id   BIGINT UNSIGNED NOT NULL,
  language      VARCHAR(20) NOT NULL,
  tests_passed  SMALLINT UNSIGNED NOT NULL,
  tests_total   SMALLINT UNSIGNED NOT NULL,
  output_key    VARCHAR(500) NULL,
  ran_at        DATETIME NOT NULL,
  FOREIGN KEY (response_id) REFERENCES item_responses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. Projects, peer review, appeals (spec sections 6.11–6.12)
-- =============================================================================

CREATE TABLE projects (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(26) NOT NULL,
  tenant_id       BIGINT UNSIGNED NOT NULL,
  course_id       BIGINT UNSIGNED NULL,
  title           VARCHAR(190) NOT NULL,
  problem_statement MEDIUMTEXT NOT NULL,
  requirements    MEDIUMTEXT NULL,
  resources       JSON NULL,
  rubric_id       BIGINT UNSIGNED NOT NULL,
  team_size_max   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  peer_reviewers  TINYINT UNSIGNED NOT NULL DEFAULT 3,        -- ≥3 (FR-PR-1)
  calibration_required BOOLEAN NOT NULL DEFAULT TRUE,
  instructor_final BOOLEAN NOT NULL DEFAULT FALSE,            -- instructor grade decides (credential projects)
  max_revisions   TINYINT UNSIGNED NOT NULL DEFAULT 2,
  status          ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
  created_at      DATETIME NULL,
  UNIQUE KEY uq_projects_public (public_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL,
  FOREIGN KEY (rubric_id) REFERENCES rubrics (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_milestones (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id  BIGINT UNSIGNED NOT NULL,
  position    INT UNSIGNED NOT NULL,
  title       VARCHAR(190) NOT NULL,
  description TEXT NULL,
  due_offset_days SMALLINT UNSIGNED NULL,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teams (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id  BIGINT UNSIGNED NOT NULL,
  cohort_id   BIGINT UNSIGNED NULL,
  name        VARCHAR(120) NOT NULL,
  created_at  DATETIME NULL,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE team_members (
  team_id  BIGINT UNSIGNED NOT NULL,
  user_id  BIGINT UNSIGNED NOT NULL,
  role     VARCHAR(60) NULL,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per submission round (revision 0, 1, 2…).
CREATE TABLE project_submissions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id     CHAR(26) NOT NULL,
  project_id    BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NULL,                         -- individual
  team_id       BIGINT UNSIGNED NULL,                         -- or team
  milestone_id  BIGINT UNSIGNED NULL,
  revision      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  summary       TEXT NULL,
  artefacts     JSON NOT NULL,                                -- [{"kind":"file","media":…},{"kind":"github","url":…}]
  ai_feedback   MEDIUMTEXT NULL,                              -- advisory, shown as "AI feedback"
  instructor_feedback MEDIUMTEXT NULL,
  final_score_pct DECIMAL(5,2) NULL,
  passed        BOOLEAN NULL,
  status        ENUM('submitted','in_peer_review','moderation','graded','revision_requested','passed','failed') NOT NULL DEFAULT 'submitted',
  submitted_at  DATETIME NOT NULL,
  graded_at     DATETIME NULL,
  UNIQUE KEY uq_project_submissions_public (public_id),
  KEY ix_project_submissions_project (project_id, status),
  FOREIGN KEY (project_id)   REFERENCES projects (id)           ON DELETE CASCADE,
  FOREIGN KEY (user_id)      REFERENCES users (id)              ON DELETE CASCADE,
  FOREIGN KEY (team_id)      REFERENCES teams (id)              ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES project_milestones (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rubric scores from any grader (peer, instructor, mentor) per criterion.
CREATE TABLE rubric_scores (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id  BIGINT UNSIGNED NOT NULL,
  criterion_id   BIGINT UNSIGNED NOT NULL,
  grader_id      BIGINT UNSIGNED NOT NULL,
  grader_role    ENUM('peer','instructor','mentor','ai_proposal') NOT NULL,
  points         DECIMAL(6,2) NOT NULL,
  comment        TEXT NULL,
  weight         DECIMAL(4,3) NOT NULL DEFAULT 1.000,          -- reviewer reliability weight
  created_at     DATETIME NOT NULL,
  UNIQUE KEY uq_rubric_scores (submission_id, criterion_id, grader_id, grader_role),
  FOREIGN KEY (submission_id) REFERENCES project_submissions (id) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id)  REFERENCES rubric_criteria (id),
  FOREIGN KEY (grader_id)     REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Anonymous peer-review assignments (FR-PR-1..5).
CREATE TABLE peer_reviews (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id  BIGINT UNSIGNED NOT NULL,
  reviewer_id    BIGINT UNSIGNED NOT NULL,
  assigned_at    DATETIME NOT NULL,
  due_at         DATETIME NOT NULL,
  submitted_at   DATETIME NULL,
  overall_comment TEXT NULL,
  agreement      DECIMAL(5,4) NULL,                           -- vs. consensus, for reliability
  ai_criteria_warning BOOLEAN NOT NULL DEFAULT FALSE,         -- review ignored the rubric
  status         ENUM('assigned','submitted','expired','discarded') NOT NULL DEFAULT 'assigned',
  UNIQUE KEY uq_peer_reviews (submission_id, reviewer_id),
  KEY ix_peer_reviews_reviewer (reviewer_id, status),
  FOREIGN KEY (submission_id) REFERENCES project_submissions (id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id)   REFERENCES users (id)               ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Calibration: reviewer grades an instructor-scored sample first.
CREATE TABLE reviewer_calibrations (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id   BIGINT UNSIGNED NOT NULL,
  reviewer_id  BIGINT UNSIGNED NOT NULL,
  sample_submission_id BIGINT UNSIGNED NOT NULL,
  accuracy     DECIMAL(5,4) NOT NULL,
  completed_at DATETIME NOT NULL,
  UNIQUE KEY uq_reviewer_calibrations (project_id, reviewer_id, sample_submission_id),
  FOREIGN KEY (project_id)           REFERENCES projects (id)            ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id)          REFERENCES users (id)               ON DELETE CASCADE,
  FOREIGN KEY (sample_submission_id) REFERENCES project_submissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviewer quality over time (FR-PR-4).
CREATE TABLE reviewer_stats (
  user_id        BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  reviews_done   INT UNSIGNED NOT NULL DEFAULT 0,
  mean_agreement DECIMAL(5,4) NULL,
  helpful_votes  INT UNSIGNED NOT NULL DEFAULT 0,
  trusted        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One appeal per graded thing (FR-PR-6).
CREATE TABLE appeals (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  target_type   ENUM('project_submission','attempt','evidence','credential') NOT NULL,
  target_id     BIGINT UNSIGNED NOT NULL,
  reason        TEXT NOT NULL,
  status        ENUM('open','upheld','rejected','withdrawn') NOT NULL DEFAULT 'open',
  decided_by    BIGINT UNSIGNED NULL,
  decision_note TEXT NULL,
  created_at    DATETIME NOT NULL,
  decided_at    DATETIME NULL,
  UNIQUE KEY uq_appeals_target (user_id, target_type, target_id),
  FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (decided_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. Portfolio and credentials (spec sections 6.13–6.14, section 16)
-- =============================================================================

CREATE TABLE portfolios (
  user_id      BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  title        VARCHAR(190) NULL,
  about        TEXT NULL,
  -- Never public for under-18s (enforced in app; FR-PF-2).
  visibility   ENUM('private','link','public') NOT NULL DEFAULT 'private',
  theme        VARCHAR(40) NULL,
  updated_at   DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE portfolio_items (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id    CHAR(26) NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  kind         ENUM('project','credential','assessment','publication','research','presentation','github','external','capstone') NOT NULL,
  title        VARCHAR(190) NOT NULL,
  description  TEXT NULL,
  submission_id BIGINT UNSIGNED NULL,
  credential_id BIGINT UNSIGNED NULL,
  url          VARCHAR(500) NULL,
  media_id     BIGINT UNSIGNED NULL,
  verified     BOOLEAN NOT NULL DEFAULT FALSE,                -- "Verified by ClassProject Open"
  visible      BOOLEAN NOT NULL DEFAULT FALSE,
  position     INT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL,
  UNIQUE KEY uq_portfolio_items_public (public_id),
  KEY ix_portfolio_items_user (user_id, position),
  FOREIGN KEY (user_id)       REFERENCES users (id)               ON DELETE CASCADE,
  FOREIGN KEY (submission_id) REFERENCES project_submissions (id) ON DELETE SET NULL,
  FOREIGN KEY (media_id)      REFERENCES media_assets (id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE portfolio_item_skills (
  portfolio_item_id BIGINT UNSIGNED NOT NULL,
  skill_id          BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (portfolio_item_id, skill_id),
  FOREIGN KEY (portfolio_item_id) REFERENCES portfolio_items (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)          REFERENCES skills (id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-issuer signing keys (did:web), rotated.
CREATE TABLE issuer_keys (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  did          VARCHAR(255) NOT NULL,
  key_id       VARCHAR(255) NOT NULL,
  algorithm    ENUM('Ed25519','ES256') NOT NULL DEFAULT 'Ed25519',
  public_jwk   JSON NOT NULL,                                 -- private key lives in the KMS, never here
  active_from  DATETIME NOT NULL,
  retired_at   DATETIME NULL,
  UNIQUE KEY uq_issuer_keys (key_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE credential_definitions (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id      CHAR(26) NOT NULL,
  tenant_id      BIGINT UNSIGNED NOT NULL,                    -- issuer
  kind           ENUM('certificate','microcredential','badge','competency','skill_verification','project_verification','assessment','institution','industry','participation') NOT NULL,
  name           VARCHAR(190) NOT NULL,
  description    TEXT NULL,
  criteria_text  TEXT NOT NULL,
  course_id      BIGINT UNSIGNED NULL,
  program_id     BIGINT UNSIGNED NULL,
  validity_months SMALLINT UNSIGNED NULL,
  image_key      VARCHAR(500) NULL,
  requires_human_approval BOOLEAN NOT NULL DEFAULT FALSE,
  status         ENUM('draft','published','retired') NOT NULL DEFAULT 'draft',
  created_at     DATETIME NULL,
  UNIQUE KEY uq_credential_definitions_public (public_id),
  FOREIGN KEY (tenant_id)  REFERENCES tenants (id),
  FOREIGN KEY (course_id)  REFERENCES courses (id)  ON DELETE SET NULL,
  FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Machine-checkable criteria. Publishing requires ≥1 assessment or project row (FR-CR-4)
-- unless kind = 'participation'.
CREATE TABLE credential_criteria (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  definition_id   BIGINT UNSIGNED NOT NULL,
  kind            ENUM('skill_state','assessment_pass','project_pass','course_complete','live_attendance') NOT NULL,
  skill_id        BIGINT UNSIGNED NULL,
  min_state       ENUM('understood','applied','verified') NULL,
  assessment_id   BIGINT UNSIGNED NULL,
  project_id      BIGINT UNSIGNED NULL,
  min_score_pct   DECIMAL(5,2) NULL,
  FOREIGN KEY (definition_id) REFERENCES credential_definitions (id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id)      REFERENCES skills (id),
  FOREIGN KEY (assessment_id) REFERENCES assessments (id),
  FOREIGN KEY (project_id)    REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Issued credentials (Open Badges 3.0 VCs).
CREATE TABLE credentials (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id         CHAR(26) NOT NULL,
  verification_code CHAR(12) NOT NULL,                        -- human-friendly: /verify/7KQ2-M9XD-4TPA
  definition_id     BIGINT UNSIGNED NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  issued_at         DATETIME NULL,
  expires_at        DATETIME NULL,
  status            ENUM('pending_approval','active','revoked','expired') NOT NULL DEFAULT 'pending_approval',
  approved_by       BIGINT UNSIGNED NULL,
  issuer_key_id     BIGINT UNSIGNED NULL,
  vc_json           JSON NULL,                                -- signed Verifiable Credential
  pdf_key           VARCHAR(500) NULL,
  revoked_at        DATETIME NULL,
  revocation_reason VARCHAR(255) NULL,
  UNIQUE KEY uq_credentials_public (public_id),
  UNIQUE KEY uq_credentials_code (verification_code),
  KEY ix_credentials_user (user_id, status),
  FOREIGN KEY (definition_id) REFERENCES credential_definitions (id),
  FOREIGN KEY (user_id)       REFERENCES users (id),
  FOREIGN KEY (approved_by)   REFERENCES users (id)       ON DELETE SET NULL,
  FOREIGN KEY (issuer_key_id) REFERENCES issuer_keys (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The evidence a credential rests on (attempts, submissions, skills at a state).
CREATE TABLE credential_evidence (
  credential_id BIGINT UNSIGNED NOT NULL,
  kind          ENUM('attempt','project_submission','skill','live_session') NOT NULL,
  ref_id        BIGINT UNSIGNED NOT NULL,
  summary       VARCHAR(255) NOT NULL,                        -- shown on the verification page
  PRIMARY KEY (credential_id, kind, ref_id),
  FOREIGN KEY (credential_id) REFERENCES credentials (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE portfolio_items ADD FOREIGN KEY (credential_id) REFERENCES credentials (id) ON DELETE SET NULL;

-- =============================================================================
-- 11. Community, cohorts, mentorship, moderation (spec section 6.16)
-- =============================================================================

-- One table for all structured spaces.
CREATE TABLE communities (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id    CHAR(26) NOT NULL,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  kind         ENUM('course','study_group','cohort','circle','project_team','regional','professional','interest') NOT NULL,
  name         VARCHAR(190) NOT NULL,
  description  TEXT NULL,
  course_id    BIGINT UNSIGNED NULL,
  visibility   ENUM('public','members','invite') NOT NULL DEFAULT 'members',
  adults_only  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   BIGINT UNSIGNED NULL,
  created_at   DATETIME NULL,
  UNIQUE KEY uq_communities_public (public_id),
  KEY ix_communities_course (course_id),
  FOREIGN KEY (tenant_id)  REFERENCES tenants (id),
  FOREIGN KEY (course_id)  REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE community_members (
  community_id BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  role         ENUM('member','moderator','owner','expert') NOT NULL DEFAULT 'member',
  joined_at    DATETIME NOT NULL,
  PRIMARY KEY (community_id, user_id),
  KEY ix_community_members_user (user_id),
  FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)      REFERENCES users (id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cohort-based runs of a course/program (dates, pacing).
CREATE TABLE cohorts (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id    CHAR(26) NOT NULL,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  community_id BIGINT UNSIGNED NULL,
  course_id    BIGINT UNSIGNED NULL,
  program_id   BIGINT UNSIGNED NULL,
  name         VARCHAR(190) NOT NULL,
  starts_on    DATE NOT NULL,
  ends_on      DATE NULL,
  capacity     INT UNSIGNED NULL,
  status       ENUM('planned','enrolling','running','finished') NOT NULL DEFAULT 'planned',
  UNIQUE KEY uq_cohorts_public (public_id),
  FOREIGN KEY (tenant_id)    REFERENCES tenants (id),
  FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE SET NULL,
  FOREIGN KEY (course_id)    REFERENCES courses (id)     ON DELETE CASCADE,
  FOREIGN KEY (program_id)   REFERENCES programs (id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE enrollments ADD FOREIGN KEY (cohort_id) REFERENCES cohorts (id) ON DELETE SET NULL;
ALTER TABLE teams       ADD FOREIGN KEY (cohort_id) REFERENCES cohorts (id) ON DELETE SET NULL;

-- Questions, discussions and announcements in a community.
CREATE TABLE threads (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(26) NOT NULL,
  community_id    BIGINT UNSIGNED NOT NULL,
  activity_id     BIGINT UNSIGNED NULL,                        -- asked from a lesson
  at_second       INT UNSIGNED NULL,                           -- time-stamped video comment
  author_id       BIGINT UNSIGNED NOT NULL,
  kind            ENUM('question','discussion','announcement','showcase') NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            MEDIUMTEXT NOT NULL,
  accepted_post_id BIGINT UNSIGNED NULL,
  endorsed_post_id BIGINT UNSIGNED NULL,                       -- instructor-endorsed answer
  answered        BOOLEAN NOT NULL DEFAULT FALSE,
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  locked          BOOLEAN NOT NULL DEFAULT FALSE,
  status          ENUM('visible','pending_review','hidden','deleted') NOT NULL DEFAULT 'visible',
  created_at      DATETIME NOT NULL,
  last_activity_at DATETIME NOT NULL,
  UNIQUE KEY uq_threads_public (public_id),
  KEY ix_threads_community (community_id, answered, last_activity_at),
  FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id)  REFERENCES activities (id)  ON DELETE SET NULL,
  FOREIGN KEY (author_id)    REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE posts (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id   BIGINT UNSIGNED NOT NULL,
  parent_id   BIGINT UNSIGNED NULL,
  author_id   BIGINT UNSIGNED NOT NULL,
  body        MEDIUMTEXT NOT NULL,
  votes       INT NOT NULL DEFAULT 0,
  status      ENUM('visible','pending_review','hidden','deleted') NOT NULL DEFAULT 'visible',
  created_at  DATETIME NOT NULL,
  edited_at   DATETIME NULL,
  KEY ix_posts_thread (thread_id, created_at),
  FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES posts (id)   ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE threads
  ADD FOREIGN KEY (accepted_post_id) REFERENCES posts (id) ON DELETE SET NULL,
  ADD FOREIGN KEY (endorsed_post_id) REFERENCES posts (id) ON DELETE SET NULL;

CREATE TABLE post_votes (
  post_id  BIGINT UNSIGNED NOT NULL,
  user_id  BIGINT UNSIGNED NOT NULL,
  value    TINYINT NOT NULL,                                  -- +1 / -1
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE follows (
  follower_id BIGINT UNSIGNED NOT NULL,
  followee_id BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (followee_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mentorships (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  mentor_id    BIGINT UNSIGNED NOT NULL,
  learner_id   BIGINT UNSIGNED NOT NULL,
  goal_id      BIGINT UNSIGNED NULL,
  status       ENUM('requested','active','ended','declined') NOT NULL DEFAULT 'requested',
  started_at   DATETIME NULL,
  ended_at     DATETIME NULL,
  UNIQUE KEY uq_mentorships (mentor_id, learner_id, tenant_id),
  FOREIGN KEY (tenant_id)  REFERENCES tenants (id),
  FOREIGN KEY (mentor_id)  REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (goal_id)    REFERENCES goals (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Help requests: AI escalations and "talk to a human" (FR-AI-6), routed to mentors/instructors.
CREATE TABLE help_requests (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  course_id     BIGINT UNSIGNED NULL,
  activity_id   BIGINT UNSIGNED NULL,
  source        ENUM('learner','ai_escalation','safeguarding') NOT NULL,
  summary       TEXT NOT NULL,
  ai_interaction_id BIGINT UNSIGNED NULL,
  assigned_to   BIGINT UNSIGNED NULL,
  status        ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  created_at    DATETIME NOT NULL,
  resolved_at   DATETIME NULL,
  KEY ix_help_requests_status (tenant_id, status, created_at),
  FOREIGN KEY (tenant_id)   REFERENCES tenants (id),
  FOREIGN KEY (user_id)     REFERENCES users (id)      ON DELETE CASCADE,
  FOREIGN KEY (course_id)   REFERENCES courses (id)    ON DELETE SET NULL,
  FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users (id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE moderation_reports (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  reporter_id  BIGINT UNSIGNED NULL,                           -- NULL = automated pre-screen
  target_type  ENUM('thread','post','portfolio_item','user','message','review') NOT NULL,
  target_id    BIGINT UNSIGNED NOT NULL,
  reason       ENUM('spam','abuse','harassment','safeguarding','copyright','misinformation','other') NOT NULL,
  detail       TEXT NULL,
  ai_score     DECIMAL(4,3) NULL,
  status       ENUM('open','actioned','dismissed') NOT NULL DEFAULT 'open',
  created_at   DATETIME NOT NULL,
  KEY ix_moderation_reports_status (tenant_id, status, created_at),
  FOREIGN KEY (tenant_id)   REFERENCES tenants (id),
  FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Human decisions only (P3: humans decide sanctions).
CREATE TABLE moderation_actions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id    BIGINT UNSIGNED NULL,
  moderator_id BIGINT UNSIGNED NOT NULL,
  action       ENUM('hide','delete','warn','restrict','suspend','restore','escalate') NOT NULL,
  note         TEXT NULL,
  created_at   DATETIME NOT NULL,
  FOREIGN KEY (report_id)    REFERENCES moderation_reports (id) ON DELETE SET NULL,
  FOREIGN KEY (moderator_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. Live learning (spec section 6.18, section 13.3)
-- =============================================================================

CREATE TABLE live_sessions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(26) NOT NULL,
  tenant_id       BIGINT UNSIGNED NOT NULL,
  kind            ENUM('class','office_hours','study_session','mentoring','webinar') NOT NULL,
  course_id       BIGINT UNSIGNED NULL,
  cohort_id       BIGINT UNSIGNED NULL,
  community_id    BIGINT UNSIGNED NULL,
  host_id         BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(190) NOT NULL,
  description     TEXT NULL,
  starts_at       DATETIME NOT NULL,
  ends_at         DATETIME NOT NULL,
  provider_room   VARCHAR(120) NULL,
  status          ENUM('scheduled','live','ended','cancelled') NOT NULL DEFAULT 'scheduled',
  recording_media_id  BIGINT UNSIGNED NULL,
  transcript_media_id BIGINT UNSIGNED NULL,
  summary_draft_id    BIGINT UNSIGNED NULL,                   -- AI summary awaiting host approval
  created_at      DATETIME NULL,
  UNIQUE KEY uq_live_sessions_public (public_id),
  KEY ix_live_sessions_time (status, starts_at),
  FOREIGN KEY (tenant_id)           REFERENCES tenants (id),
  FOREIGN KEY (course_id)           REFERENCES courses (id)      ON DELETE CASCADE,
  FOREIGN KEY (cohort_id)           REFERENCES cohorts (id)      ON DELETE SET NULL,
  FOREIGN KEY (community_id)        REFERENCES communities (id)  ON DELETE SET NULL,
  FOREIGN KEY (host_id)             REFERENCES users (id),
  FOREIGN KEY (recording_media_id)  REFERENCES media_assets (id) ON DELETE SET NULL,
  FOREIGN KEY (transcript_media_id) REFERENCES media_assets (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stretches in the room (leave/rejoin keeps every stretch, as in ClassProject).
CREATE TABLE live_attendance (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  live_session_id  BIGINT UNSIGNED NOT NULL,
  user_id          BIGINT UNSIGNED NOT NULL,
  joined_at        DATETIME NOT NULL,
  left_at          DATETIME NULL,
  mode             ENUM('video','audio_only','dial_in') NOT NULL DEFAULT 'video',
  KEY ix_live_attendance (live_session_id, user_id, joined_at),
  FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE live_polls (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  live_session_id BIGINT UNSIGNED NOT NULL,
  item_id         BIGINT UNSIGNED NULL,                        -- graded poll = bank item
  question        VARCHAR(500) NOT NULL,
  options         JSON NOT NULL,
  opened_at       DATETIME NOT NULL,
  closed_at       DATETIME NULL,
  FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)         REFERENCES items (id)         ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE live_poll_answers (
  poll_id   BIGINT UNSIGNED NOT NULL,
  user_id   BIGINT UNSIGNED NOT NULL,
  answer    JSON NOT NULL,
  answered_at DATETIME NOT NULL,
  PRIMARY KEY (poll_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES live_polls (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 13. AI: models, interactions, drafts, recommendations (spec section 12)
-- =============================================================================

-- Model choices are data, not code (spec section 12.2).
CREATE TABLE ai_model_configs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  feature      VARCHAR(60) NOT NULL,                          -- tutor, hints, authoring, grading_assist, quality_scan, summary, moderation, embedding
  tier         ENUM('fast','standard','deep','embedding') NOT NULL,
  provider     VARCHAR(40) NOT NULL,
  model        VARCHAR(120) NOT NULL,
  fallback_provider VARCHAR(40) NULL,
  fallback_model VARCHAR(120) NULL,
  prompt_version VARCHAR(40) NULL,
  max_output_tokens INT UNSIGNED NULL,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at   DATETIME NULL,
  UNIQUE KEY uq_ai_model_configs_feature (feature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One tutoring / authoring / grading session (the audit unit, spec section 12.4).
CREATE TABLE ai_interactions (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id      CHAR(26) NOT NULL,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NOT NULL,
  feature        VARCHAR(60) NOT NULL,
  course_id      BIGINT UNSIGNED NULL,
  activity_id    BIGINT UNSIGNED NULL,
  safety_profile ENUM('adult','under18','assessment') NOT NULL,
  model          VARCHAR(120) NOT NULL,
  input_tokens   INT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens  INT UNSIGNED NOT NULL DEFAULT 0,
  cost_usd       DECIMAL(10,6) NOT NULL DEFAULT 0,
  flags          JSON NULL,                                   -- safety, uncertainty, escalated
  escalated      BOOLEAN NOT NULL DEFAULT FALSE,
  helpful        BOOLEAN NULL,                                -- learner feedback
  started_at     DATETIME NOT NULL,
  UNIQUE KEY uq_ai_interactions_public (public_id),
  KEY ix_ai_interactions_user (user_id, started_at),
  KEY ix_ai_interactions_tenant (tenant_id, feature, started_at),
  FOREIGN KEY (tenant_id)   REFERENCES tenants (id),
  FOREIGN KEY (user_id)     REFERENCES users (id)      ON DELETE CASCADE,
  FOREIGN KEY (course_id)   REFERENCES courses (id)    ON DELETE SET NULL,
  FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE help_requests ADD FOREIGN KEY (ai_interaction_id) REFERENCES ai_interactions (id) ON DELETE SET NULL;

-- Messages within an interaction, with their provenance label and verified citations.
-- Partitioned by month; no FKs.
CREATE TABLE ai_messages (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at      DATETIME NOT NULL,
  interaction_id  BIGINT UNSIGNED NOT NULL,
  role            ENUM('learner','assistant','system_note') NOT NULL,
  label           ENUM('course_content','ai_explanation','external_knowledge','hint','refusal') NULL,
  content         MEDIUMTEXT NOT NULL,
  citations       JSON NULL,                                  -- [{"chunk":"…","activity":"…","at_second":312}] — verified IDs only
  latency_ms      INT UNSIGNED NULL,
  PRIMARY KEY (id, created_at),
  KEY ix_ai_messages_interaction (interaction_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE COLUMNS (created_at) (
  PARTITION p2026_09 VALUES LESS THAN ('2026-10-01'),
  PARTITION p2026_10 VALUES LESS THAN ('2026-11-01'),
  PARTITION p2026_11 VALUES LESS THAN ('2026-12-01'),
  PARTITION pmax     VALUES LESS THAN (MAXVALUE)
);

-- Everything AI Studio (or summaries/captions) drafts waits here for a human (FR-ST-3).
CREATE TABLE ai_drafts (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  course_id      BIGINT UNSIGNED NULL,
  requested_by   BIGINT UNSIGNED NOT NULL,
  kind           ENUM('course_outline','lesson_plan','objectives','quiz','assignment','case_study','discussion_questions','flashcards','practice','rubric','revision','accessibility_metadata','video_summary','live_summary','caption') NOT NULL,
  input_sources  JSON NULL,                                   -- media / documents used
  content        JSON NOT NULL,
  model          VARCHAR(120) NOT NULL,
  status         ENUM('draft','approved','edited_and_approved','rejected') NOT NULL DEFAULT 'draft',
  reviewed_by    BIGINT UNSIGNED NULL,
  reviewed_at    DATETIME NULL,
  created_at     DATETIME NOT NULL,
  KEY ix_ai_drafts_course (course_id, status),
  FOREIGN KEY (tenant_id)    REFERENCES tenants (id),
  FOREIGN KEY (course_id)    REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users (id),
  FOREIGN KEY (reviewed_by)  REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE activities    ADD FOREIGN KEY (ai_draft_id)      REFERENCES ai_drafts (id) ON DELETE SET NULL;
ALTER TABLE courses       ADD FOREIGN KEY (thumbnail_media_id) REFERENCES media_assets (id) ON DELETE SET NULL;
ALTER TABLE live_sessions ADD FOREIGN KEY (summary_draft_id) REFERENCES ai_drafts (id) ON DELETE SET NULL;

-- Recommendations shown to learners, each with its reason (FR-DS-4), and what happened.
CREATE TABLE recommendations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  target_type   ENUM('course','path','activity','skill','project','community','mentor','review') NOT NULL,
  target_id     BIGINT UNSIGNED NOT NULL,
  reason_code   ENUM('goal_gap','next_step','spaced_review','subject_match','interest_match','exam_prep','peers_with_goal','curiosity','time_fit','partner_referral','remediation','enrichment') NOT NULL,
  reason_text   VARCHAR(255) NOT NULL,
  score         DECIMAL(6,4) NOT NULL,
  model_version VARCHAR(40) NOT NULL,
  shown_at      DATETIME NOT NULL,
  clicked_at    DATETIME NULL,
  dismissed_at  DATETIME NULL,
  KEY ix_recommendations_user (user_id, shown_at),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 14. Commerce: products, price books, orders, subscriptions, payouts (spec section 6.25)
-- =============================================================================

CREATE TABLE products (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id   CHAR(26) NOT NULL,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  kind        ENUM('course','program','certificate','subscription_plan','cohort_seat','institution_licence','corporate_seats') NOT NULL,
  course_id   BIGINT UNSIGNED NULL,
  program_id  BIGINT UNSIGNED NULL,
  credential_definition_id BIGINT UNSIGNED NULL,
  cohort_id   BIGINT UNSIGNED NULL,
  name        VARCHAR(190) NOT NULL,
  billing     ENUM('one_time','monthly','yearly') NOT NULL DEFAULT 'one_time',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_products_public (public_id),
  FOREIGN KEY (tenant_id)  REFERENCES tenants (id),
  FOREIGN KEY (course_id)  REFERENCES courses (id)  ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE,
  FOREIGN KEY (credential_definition_id) REFERENCES credential_definitions (id) ON DELETE CASCADE,
  FOREIGN KEY (cohort_id)  REFERENCES cohorts (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Regional pricing (D10): one price book per country/region, prices per product.
CREATE TABLE price_books (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(80) NOT NULL,                             -- "Ghana", "West Africa (XOF)", "Global USD"
  currency  CHAR(3) NOT NULL,
  ppp_index DECIMAL(6,3) NULL,                                -- relative to USD list price
  active    BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE countries ADD FOREIGN KEY (price_book_id) REFERENCES price_books (id) ON DELETE SET NULL;

CREATE TABLE prices (
  price_book_id BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  valid_from    DATETIME NOT NULL,
  valid_to      DATETIME NULL,
  PRIMARY KEY (price_book_id, product_id, valid_from),
  FOREIGN KEY (price_book_id) REFERENCES price_books (id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)    REFERENCES products (id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vouchers (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  code         VARCHAR(40) NOT NULL,
  kind         ENUM('discount_pct','discount_amount','free_access','scholarship') NOT NULL,
  value        DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency     CHAR(3) NULL,
  product_id   BIGINT UNSIGNED NULL,
  max_uses     INT UNSIGNED NULL,
  used         INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at   DATETIME NULL,
  UNIQUE KEY uq_vouchers_code (code),
  FOREIGN KEY (tenant_id)  REFERENCES tenants (id),
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id    CHAR(26) NOT NULL,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  country_code CHAR(2) NOT NULL,
  currency     CHAR(3) NOT NULL,
  subtotal     DECIMAL(12,2) NOT NULL,
  discount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax          DECIMAL(12,2) NOT NULL DEFAULT 0,
  total        DECIMAL(12,2) NOT NULL,
  voucher_id   BIGINT UNSIGNED NULL,
  status       ENUM('pending','paid','failed','refunded','partially_refunded','cancelled') NOT NULL DEFAULT 'pending',
  idempotency_key CHAR(36) NOT NULL,
  created_at   DATETIME NOT NULL,
  paid_at      DATETIME NULL,
  UNIQUE KEY uq_orders_public (public_id),
  UNIQUE KEY uq_orders_idem (idempotency_key),
  KEY ix_orders_user (user_id, created_at),
  FOREIGN KEY (tenant_id)    REFERENCES tenants (id),
  FOREIGN KEY (user_id)      REFERENCES users (id),
  FOREIGN KEY (country_code) REFERENCES countries (code),
  FOREIGN KEY (voucher_id)   REFERENCES vouchers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  unit_amount DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Provider-agnostic payment attempts (Paystack, Flutterwave, Stripe…).
CREATE TABLE payments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id          BIGINT UNSIGNED NOT NULL,
  provider          VARCHAR(30) NOT NULL,
  method            ENUM('card','mobile_money','bank_transfer','voucher','invoice') NOT NULL,
  network           VARCHAR(30) NULL,                         -- mtn, telecel, airteltigo, mpesa…
  provider_ref      VARCHAR(120) NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  currency          CHAR(3) NOT NULL,
  status            ENUM('initiated','pending','succeeded','failed','refunded') NOT NULL DEFAULT 'initiated',
  failure_reason    VARCHAR(255) NULL,
  raw               JSON NULL,                                -- last webhook payload (redacted)
  created_at        DATETIME NOT NULL,
  settled_at        DATETIME NULL,
  UNIQUE KEY uq_payments_provider_ref (provider, provider_ref),
  FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refunds (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id  BIGINT UNSIGNED NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  reason      VARCHAR(255) NULL,
  status      ENUM('requested','processed','failed') NOT NULL DEFAULT 'requested',
  requested_by BIGINT UNSIGNED NULL,
  created_at  DATETIME NOT NULL,
  FOREIGN KEY (payment_id)   REFERENCES payments (id),
  FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subscriptions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       CHAR(26) NOT NULL,
  user_id         BIGINT UNSIGNED NULL,                       -- personal
  tenant_id       BIGINT UNSIGNED NULL,                       -- or organisation seats
  product_id      BIGINT UNSIGNED NOT NULL,
  seats           INT UNSIGNED NOT NULL DEFAULT 1,
  provider        VARCHAR(30) NOT NULL,
  provider_ref    VARCHAR(120) NULL,
  status          ENUM('trialing','active','past_due','cancelled','expired') NOT NULL,
  current_period_end DATETIME NOT NULL,
  cancel_at       DATETIME NULL,
  created_at      DATETIME NOT NULL,
  UNIQUE KEY uq_subscriptions_public (public_id),
  FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id)  REFERENCES tenants (id)  ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- What a user may access, from any source (purchase, subscription, licence, scholarship).
CREATE TABLE entitlements (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  product_id   BIGINT UNSIGNED NOT NULL,
  source       ENUM('order','subscription','licence','scholarship','voucher','grant') NOT NULL,
  source_id    BIGINT UNSIGNED NULL,
  starts_at    DATETIME NOT NULL,
  ends_at      DATETIME NULL,
  KEY ix_entitlements_user (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE scholarship_applications (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  product_id   BIGINT UNSIGNED NOT NULL,
  statement    TEXT NOT NULL,
  status       ENUM('submitted','approved','declined') NOT NULL DEFAULT 'submitted',
  reviewed_by  BIGINT UNSIGNED NULL,
  created_at   DATETIME NOT NULL,
  decided_at   DATETIME NULL,
  FOREIGN KEY (user_id)     REFERENCES users (id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products (id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users (id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marketplace payouts (FR-MK-4).
CREATE TABLE payout_accounts (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_type   ENUM('user','tenant') NOT NULL,
  owner_id     BIGINT UNSIGNED NOT NULL,
  method       ENUM('bank','mobile_money','stripe_connect') NOT NULL,
  details_enc  VARBINARY(1024) NOT NULL,
  currency     CHAR(3) NOT NULL,
  verified_at  DATETIME NULL,
  KEY ix_payout_accounts_owner (owner_type, owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE revenue_shares (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_item_id BIGINT UNSIGNED NOT NULL,
  payee_type    ENUM('user','tenant','platform') NOT NULL,
  payee_id      BIGINT UNSIGNED NULL,
  amount        DECIMAL(12,2) NOT NULL,
  currency      CHAR(3) NOT NULL,
  payout_id     BIGINT UNSIGNED NULL,
  FOREIGN KEY (order_item_id) REFERENCES order_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payouts (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id   BIGINT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  currency     CHAR(3) NOT NULL,
  status       ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  provider_ref VARCHAR(120) NULL,
  paid_at      DATETIME NULL,
  FOREIGN KEY (account_id) REFERENCES payout_accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE revenue_shares ADD FOREIGN KEY (payout_id) REFERENCES payouts (id) ON DELETE SET NULL;

-- =============================================================================
-- 15. Notifications (spec section 6.21)
-- =============================================================================

CREATE TABLE notification_preferences (
  user_id     BIGINT UNSIGNED NOT NULL,
  kind        VARCHAR(40) NOT NULL,                           -- learning_reminder, review_due, assessment_deadline…
  channels    JSON NOT NULL,                                  -- ["in_app","push","email","sms","whatsapp"]
  frequency   ENUM('instant','daily_digest','weekly_digest','off') NOT NULL DEFAULT 'daily_digest',
  quiet_from  TIME NULL,
  quiet_to    TIME NULL,
  PRIMARY KEY (user_id, kind),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  tenant_id   BIGINT UNSIGNED NULL,
  kind        VARCHAR(40) NOT NULL,
  title       VARCHAR(190) NOT NULL,
  body        TEXT NOT NULL,
  url         VARCHAR(500) NULL,
  read_at     DATETIME NULL,
  created_at  DATETIME NOT NULL,
  KEY ix_notifications_user (user_id, read_at, created_at),
  FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-channel delivery log. Partitioned; no FKs.
CREATE TABLE notification_deliveries (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  queued_at       DATETIME NOT NULL,
  notification_id BIGINT UNSIGNED NOT NULL,
  channel         ENUM('in_app','push','email','sms','whatsapp') NOT NULL,
  status          ENUM('queued','sent','delivered','failed','suppressed') NOT NULL DEFAULT 'queued',
  provider_ref    VARCHAR(120) NULL,
  sent_at         DATETIME NULL,
  PRIMARY KEY (id, queued_at),
  KEY ix_notification_deliveries (notification_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE COLUMNS (queued_at) (
  PARTITION p2026_09 VALUES LESS THAN ('2026-10-01'),
  PARTITION p2026_10 VALUES LESS THAN ('2026-11-01'),
  PARTITION p2026_11 VALUES LESS THAN ('2026-12-01'),
  PARTITION pmax     VALUES LESS THAN (MAXVALUE)
);

-- =============================================================================
-- 16. Partner API — ClassProject link — and other integrations (spec section 25, section 6.24)
-- =============================================================================

-- Partner and tenant API clients (HMAC-signed requests; secret held in the vault).
CREATE TABLE api_clients (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_key    VARCHAR(60) NOT NULL,                          -- X-Partner-Key
  secret_hash   CHAR(64) NOT NULL,
  name          VARCHAR(120) NOT NULL,                          -- "ClassProject"
  kind          ENUM('partner','tenant','public') NOT NULL,
  partner_code  VARCHAR(40) NULL,                               -- 'classproject'
  tenant_id     BIGINT UNSIGNED NULL,
  scopes        JSON NOT NULL,                                  -- ["partner.recommendations"]
  rate_limit_per_min INT UNSIGNED NOT NULL DEFAULT 600,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  secret_rotated_at DATETIME NULL,
  created_at    DATETIME NOT NULL,
  UNIQUE KEY uq_api_clients_key (public_key),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partner subject code (+ level band) → Open skills/topics (spec section 25.4).
-- For ClassProject the codes are its catalogue subject codes (ENG, MATH, EMATH, ICT…).
CREATE TABLE partner_subject_mappings (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_code  VARCHAR(40) NOT NULL,
  subject_code  VARCHAR(20) NOT NULL,
  subject_name  VARCHAR(120) NOT NULL,
  level_from    VARCHAR(10) NOT NULL,                          -- BASIC1 … SHS3
  level_to      VARCHAR(10) NOT NULL,
  skill_id      BIGINT UNSIGNED NULL,
  topic_id      BIGINT UNSIGNED NULL,
  competency_id BIGINT UNSIGNED NULL,                          -- e.g. a GES/NaCCA strand
  weight        DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  KEY ix_partner_subject (partner_code, subject_code),
  FOREIGN KEY (skill_id)      REFERENCES skills (id)       ON DELETE CASCADE,
  FOREIGN KEY (topic_id)      REFERENCES topics (id)       ON DELETE CASCADE,
  FOREIGN KEY (competency_id) REFERENCES competencies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Arrivals from partners (?ref=classproject&subject=EMATH&level=SHS2). Anonymous until sign-up.
CREATE TABLE partner_referrals (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_code  VARCHAR(40) NOT NULL,
  course_id     BIGINT UNSIGNED NULL,
  subject_code  VARCHAR(20) NULL,
  level         VARCHAR(10) NULL,
  visitor_hash  CHAR(64) NOT NULL,                             -- salted, rotating; not a person identifier
  user_id       BIGINT UNSIGNED NULL,                          -- set only if the visitor signs up
  landed_at     DATETIME NOT NULL,
  signed_up_at  DATETIME NULL,
  enrolled_at   DATETIME NULL,
  KEY ix_partner_referrals (partner_code, landed_at),
  KEY ix_partner_referrals_subject (partner_code, subject_code),
  FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL,
  FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LTI 1.3 platform/tool registrations (both directions).
CREATE TABLE lti_registrations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  direction     ENUM('open_as_tool','open_as_platform') NOT NULL,
  issuer        VARCHAR(255) NOT NULL,
  client_id     VARCHAR(190) NOT NULL,
  deployment_id VARCHAR(190) NULL,
  jwks_url      VARCHAR(500) NOT NULL,
  auth_url      VARCHAR(500) NULL,
  token_url     VARCHAR(500) NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_lti_registrations (issuer, client_id, deployment_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lti_links (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  registration_id BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(190) NOT NULL,
  launch_url      VARCHAR(500) NOT NULL,
  custom          JSON NULL,
  FOREIGN KEY (registration_id) REFERENCES lti_registrations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE activities ADD FOREIGN KEY (lti_link_id) REFERENCES lti_links (id) ON DELETE SET NULL;

CREATE TABLE webhook_endpoints (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  url          VARCHAR(500) NOT NULL,
  events       JSON NOT NULL,
  secret_hash  CHAR(64) NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   DATETIME NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organisation assignments of learning with due dates (FR-OR-3).
CREATE TABLE learning_assignments (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  target_type  ENUM('user','group') NOT NULL,
  target_id    BIGINT UNSIGNED NOT NULL,
  course_id    BIGINT UNSIGNED NULL,
  path_id      BIGINT UNSIGNED NULL,
  due_date     DATE NULL,
  assigned_by  BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME NOT NULL,
  KEY ix_learning_assignments_target (tenant_id, target_type, target_id),
  FOREIGN KEY (tenant_id)   REFERENCES tenants (id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)   REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (path_id)     REFERENCES paths (id)   ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 17. Audit, data rights, outbox (spec section 18, section 6.20, section 8.4)
-- =============================================================================

CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  at          DATETIME NOT NULL,
  tenant_id   BIGINT UNSIGNED NULL,
  actor_id    BIGINT UNSIGNED NULL,
  actor_label VARCHAR(190) NOT NULL,
  category    ENUM('auth','admin','content','grading','credential','consent','ai_policy','commerce','moderation','security','partner') NOT NULL,
  action      VARCHAR(120) NOT NULL,
  target_type VARCHAR(40) NULL,
  target_id   BIGINT UNSIGNED NULL,
  detail      JSON NULL,
  ip_address  VARCHAR(45) NULL,
  KEY ix_audit_logs_tenant (tenant_id, at),
  KEY ix_audit_logs_actor (actor_id, at),
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE SET NULL,
  FOREIGN KEY (actor_id)  REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Export and deletion requests (FR-LC-1).
CREATE TABLE data_requests (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  kind         ENUM('export','delete') NOT NULL,
  status       ENUM('received','processing','ready','completed','cancelled') NOT NULL DEFAULT 'received',
  file_key     VARCHAR(500) NULL,
  requested_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactional outbox → event bus (Kafka/Redpanda) → ClickHouse, notifications, AI jobs.
-- Partitioned; no FKs.
CREATE TABLE outbox_events (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at   DATETIME NOT NULL,
  aggregate    VARCHAR(40) NOT NULL,                          -- enrollment, attempt, credential…
  aggregate_id BIGINT UNSIGNED NOT NULL,
  type         VARCHAR(80) NOT NULL,                          -- ActivityCompleted, MasteryChanged…
  tenant_id    BIGINT UNSIGNED NULL,
  payload      JSON NOT NULL,
  published_at DATETIME NULL,
  PRIMARY KEY (id, created_at),
  KEY ix_outbox_unpublished (published_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE COLUMNS (created_at) (
  PARTITION p2026_09 VALUES LESS THAN ('2026-10-01'),
  PARTITION p2026_10 VALUES LESS THAN ('2026-11-01'),
  PARTITION p2026_11 VALUES LESS THAN ('2026-12-01'),
  PARTITION pmax     VALUES LESS THAN (MAXVALUE)
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 18. Reference data every install needs
-- =============================================================================

INSERT INTO price_books (id, name, currency, ppp_index) VALUES
  (1, 'Global USD', 'USD', 1.000),
  (2, 'Ghana',      'GHS', 0.350),
  (3, 'Nigeria',    'NGN', 0.300),
  (4, 'Kenya',      'KES', 0.350),
  (5, 'West Africa CFA', 'XOF', 0.380);

INSERT INTO countries (code, name, currency, default_locale, home_region, price_book_id, mobile_money) VALUES
  ('GH', 'Ghana',          'GHS', 'en-GH', 'af-west', 2, TRUE),
  ('NG', 'Nigeria',        'NGN', 'en-NG', 'af-west', 3, TRUE),
  ('KE', 'Kenya',          'KES', 'en-KE', 'af-east', 4, TRUE),
  ('CI', 'Côte d''Ivoire', 'XOF', 'fr-CI', 'af-west', 5, TRUE),
  ('SN', 'Senegal',        'XOF', 'fr-SN', 'af-west', 5, TRUE),
  ('GB', 'United Kingdom', 'GBP', 'en-GB', 'eu-west', 1, FALSE),
  ('US', 'United States',  'USD', 'en-US', 'us-east', 1, FALSE);

-- Tenant 1 is the public platform.
INSERT INTO tenants (id, public_id, kind, name, slug, country_code, home_region, visibility, status, created_at)
VALUES (1, '01J9ZC00000000000000000001', 'platform', 'ClassProject Open', 'open', 'GH', 'af-west', 'public', 'active', NOW());

INSERT INTO roles (tenant_id, `key`, name, scope, is_system) VALUES
  (NULL, 'super_admin', 'Platform Super Administrator', 'platform', TRUE),
  (NULL, 'moderator',   'Platform Moderator',           'platform', TRUE),
  (NULL, 'support',     'Platform Support',             'platform', TRUE),
  (NULL, 'learner',     'Learner',                      'tenant',   TRUE),
  (NULL, 'instructor',  'Instructor',                   'tenant',   TRUE),
  (NULL, 'ta',          'Teaching Assistant',           'tenant',   TRUE),
  (NULL, 'mentor',      'Mentor',                       'tenant',   TRUE),
  (NULL, 'reviewer',    'Content Reviewer',             'tenant',   TRUE),
  (NULL, 'tenant_admin','Institution / Organisation Admin', 'tenant', TRUE),
  (NULL, 'analyst',     'Analyst',                      'tenant',   TRUE),
  (NULL, 'billing_admin','Billing Admin',               'tenant',   TRUE);

INSERT INTO ai_model_configs (feature, tier, provider, model, prompt_version, active) VALUES
  ('moderation',     'fast',      'anthropic', 'claude-haiku-4-5-20251001', 'v1', TRUE),
  ('hints',          'fast',      'anthropic', 'claude-haiku-4-5-20251001', 'v1', TRUE),
  ('tutor',          'standard',  'anthropic', 'claude-sonnet-5',           'v1', TRUE),
  ('summary',        'standard',  'anthropic', 'claude-sonnet-5',           'v1', TRUE),
  ('grading_assist', 'standard',  'anthropic', 'claude-sonnet-5',           'v1', TRUE),
  ('quality_scan',   'standard',  'anthropic', 'claude-sonnet-5',           'v1', TRUE),
  ('authoring',      'deep',      'anthropic', 'claude-opus-5-5',           'v1', TRUE),
  ('embedding',      'embedding', 'voyage',    'voyage-multilingual',       'v1', TRUE);

-- The ClassProject partner's subject names; skills/topics are mapped by admins in the
-- Partner integrations screen once the platform skill taxonomy is loaded.
INSERT INTO frameworks (public_id, tenant_id, kind, name, version, status, created_at) VALUES
  ('01J9ZC00000000000000000002', NULL, 'curriculum', 'Ghana SHS Curriculum (GES/NaCCA)', '2023', 'draft', NOW());
