-- =============================================================================
-- ClassRoom LMS Project — database schema
-- =============================================================================
-- Target: MySQL 8.0+ or MariaDB 10.6+ (utf8mb4). One shared database: every
-- tenant-owned row carries school_id, and every academic row also carries
-- session_id, so a school only ever sees its own data and academic years never
-- mix (spec section 3, section 7, section 60).
--
-- This file is the source of truth for the data model behind the prototype's
-- types (lib/types.ts). Keep it in step with the spec: when an entity or field
-- is added, changed or removed, update this file and database/README.md in the
-- same change. Laravel's own framework tables (sessions, cache, jobs,
-- failed_jobs) are created by the framework and are not listed here.
--
-- Conventions
--   * id BIGINT UNSIGNED AUTO_INCREMENT on every table; foreign keys end in _id.
--   * Times are DATETIME in UTC; plain dates are DATE.
--   * Money is a whole number of minor units (pesewas for GHS) in a BIGINT
--     *_minor column, with its ISO 4217 currency beside it.
--   * Nothing is hard-coded to one country: each school has a country,
--     timezone, currency and locale, and its official codes (WAEC, GES EMIS)
--     are rows in school_identifiers. Ghana is the first country.
--   * Lists the prototype keeps inside a record (read-by lists, class lists,
--     outcomes…) are separate tables here. JSON is used only where the shape
--     belongs to something else: SCORM's CMI data, question options, whiteboard
--     strokes.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Platform: settings, geography, catalogue (spec section 4, section 17.1)
-- -----------------------------------------------------------------------------

CREATE TABLE platform_settings (
  id                        TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  platform_name             VARCHAR(120) NOT NULL DEFAULT 'ClassRoom LMS Project',
  support_email             VARCHAR(190) NOT NULL,
  default_session_structure ENUM('semester','term') NOT NULL DEFAULT 'semester',
  allow_self_registration   BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_mode          BOOLEAN NOT NULL DEFAULT FALSE,
  max_upload_mb             INT UNSIGNED NOT NULL DEFAULT 200,
  recording_retention_days  INT UNSIGNED NOT NULL DEFAULT 365,
  -- Students see subject-matched courses from ClassProject Open (spec section 49.2).
  mooc_recommendations      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                DATETIME NULL,
  CONSTRAINT platform_settings_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Countries the platform serves. Each names its own first- and second-level
-- divisions, so analytics read "Region / District" in Ghana and
-- "State / LGA" in Nigeria.
CREATE TABLE countries (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code             CHAR(2)     NOT NULL UNIQUE,          -- ISO 3166-1 alpha-2, e.g. GH
  name             VARCHAR(80) NOT NULL,
  currency         CHAR(3)     NOT NULL,                 -- ISO 4217, e.g. GHS
  default_locale   VARCHAR(10) NOT NULL DEFAULT 'en',
  default_timezone VARCHAR(64) NOT NULL,                 -- IANA, e.g. Africa/Accra
  region_label     VARCHAR(40) NOT NULL DEFAULT 'Region',
  district_label   VARCHAR(40) NOT NULL DEFAULT 'District'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE regions (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  country_id BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(80)  NOT NULL,
  capital    VARCHAR(80)  NOT NULL,
  UNIQUE KEY regions_country_name (country_id, name),
  CONSTRAINT regions_country FOREIGN KEY (country_id) REFERENCES countries (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE districts (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  region_id  BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(120) NOT NULL,
  UNIQUE KEY districts_region_name (region_id, name),
  CONSTRAINT districts_region FOREIGN KEY (region_id) REFERENCES regions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The programmes and subjects every school picks from, so names and codes
-- match across tenants (spec section 17.1).
CREATE TABLE catalogue_programmes (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- Each country has its own catalogue; its schools choose only from it (spec section 17.1).
  country_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(20)  NOT NULL,
  description TEXT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NULL,
  updated_at  DATETIME NULL,
  UNIQUE KEY catalogue_programmes_country_code (country_id, code),
  CONSTRAINT catalogue_programmes_country FOREIGN KEY (country_id) REFERENCES countries (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE catalogue_subjects (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- Each country has its own catalogue; its schools choose only from it (spec section 17.1).
  country_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(20)  NOT NULL,
  description TEXT NULL,
  category    ENUM('core','elective') NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NULL,
  updated_at  DATETIME NULL,
  UNIQUE KEY catalogue_subjects_country_code (country_id, code),
  CONSTRAINT catalogue_subjects_country FOREIGN KEY (country_id) REFERENCES countries (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which catalogue programmes an elective usually belongs to.
CREATE TABLE catalogue_subject_programmes (
  catalogue_subject_id   BIGINT UNSIGNED NOT NULL,
  catalogue_programme_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (catalogue_subject_id, catalogue_programme_id),
  CONSTRAINT csp_subject   FOREIGN KEY (catalogue_subject_id)   REFERENCES catalogue_subjects (id)   ON DELETE CASCADE,
  CONSTRAINT csp_programme FOREIGN KEY (catalogue_programme_id) REFERENCES catalogue_programmes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Tenants: schools (spec section 3, section 5, section 49.1)
-- -----------------------------------------------------------------------------

CREATE TABLE schools (
  id                           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- 'vacation' is the platform-run Vacation Classes workspace (spec section 49.1).
  kind                         ENUM('school','vacation') NOT NULL DEFAULT 'school',
  name                         VARCHAR(190) NOT NULL,
  short_name                   VARCHAR(40)  NOT NULL,
  -- Category / level; 'Primary' is shown as "Basic School (Primary 1–6)".
  category                     ENUM('SHS','JHS','Primary','TVET','College','University') NOT NULL,
  ownership                    ENUM('public','private') NOT NULL,
  -- Official codes (WAEC, GES EMIS) are in school_identifiers.
  country_id                   BIGINT UNSIGNED NOT NULL,
  -- Defaults for everyone at the school, taken from the country when the school is created.
  timezone                     VARCHAR(64) NOT NULL,           -- IANA, e.g. Africa/Accra
  currency                     CHAR(3)     NOT NULL,           -- ISO 4217, e.g. GHS
  locale                       VARCHAR(10) NOT NULL DEFAULT 'en',
  region_id                    BIGINT UNSIGNED NOT NULL,
  district_id                  BIGINT UNSIGNED NOT NULL,
  address                      VARCHAR(255) NULL,
  phone                        VARCHAR(20)  NULL,
  email                        VARCHAR(190) NULL,
  website                      VARCHAR(255) NULL,
  logo_color                   CHAR(7) NOT NULL DEFAULT '#2563eb',
  logo_path                    VARCHAR(255) NULL,
  brand_primary                CHAR(7) NULL,
  brand_sidebar                CHAR(7) NULL,
  -- Content protection (spec section 5.2): recordings are watch-only unless allowed.
  student_recording_downloads  BOOLEAN NOT NULL DEFAULT FALSE,
  teacher_recording_downloads  BOOLEAN NOT NULL DEFAULT FALSE,
  student_document_downloads   BOOLEAN NOT NULL DEFAULT TRUE,
  session_structure            ENUM('semester','term','vacation') NOT NULL DEFAULT 'semester',
  -- Vacation Classes: text a student's guardian when they miss or leave a live class (spec section 49.1.8).
  guardian_alerts_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  guardian_alert_late_minutes  TINYINT UNSIGNED NOT NULL DEFAULT 10,
  guardian_alert_away_minutes  TINYINT UNSIGNED NOT NULL DEFAULT 5,
  -- Parents may sign in and follow their wards (spec section 22.3). Set by the Super
  -- Administrator at onboarding (default: on for Primary and JHS); never by the school.
  parent_access                BOOLEAN NOT NULL DEFAULT FALSE,
  status                       ENUM('active','suspended','pending','archived') NOT NULL DEFAULT 'pending',
  onboarded_on                 DATE NULL,
  created_at                   DATETIME NULL,
  updated_at                   DATETIME NULL,
  KEY schools_country_idx (country_id),
  KEY schools_region_idx (region_id),
  KEY schools_district_idx (district_id),
  KEY schools_category_idx (category, ownership),
  CONSTRAINT schools_country  FOREIGN KEY (country_id)  REFERENCES countries (id),
  CONSTRAINT schools_region   FOREIGN KEY (region_id)   REFERENCES regions (id),
  CONSTRAINT schools_district FOREIGN KEY (district_id) REFERENCES districts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kinds of official school code in each country (Ghana: the WAEC code and the
-- GES EMIS code). A scheme says what its codes are used for, so another
-- country's codes work without code changes (spec section 10.1):
--   * sign_in: school administrators sign in with this code;
--   * prefixes_usernames: student school usernames start with it.
CREATE TABLE school_identifier_schemes (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  country_id         BIGINT UNSIGNED NOT NULL,
  code               VARCHAR(40)  NOT NULL,          -- e.g. waec, ges_emis
  name               VARCHAR(80)  NOT NULL,          -- e.g. "WAEC code", "GES EMIS code"
  pattern            VARCHAR(120) NULL,              -- validation regex, e.g. ^[0-9]{7}$
  sign_in            BOOLEAN NOT NULL DEFAULT FALSE,
  prefixes_usernames BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY school_identifier_schemes_code (country_id, code),
  CONSTRAINT sis_country FOREIGN KEY (country_id) REFERENCES countries (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A school's official codes. Each code is unique within its scheme: sign-in
-- codes identify the school, and username prefixes must not collide. A school
-- without a code yet simply has no row (spec section 5.2).
CREATE TABLE school_identifiers (
  school_id  BIGINT UNSIGNED NOT NULL,
  scheme_id  BIGINT UNSIGNED NOT NULL,
  value      VARCHAR(40) NOT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (school_id, scheme_id),
  UNIQUE KEY school_identifiers_value (scheme_id, value),
  CONSTRAINT si_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
  CONSTRAINT si_scheme FOREIGN KEY (scheme_id) REFERENCES school_identifier_schemes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Access: permissions, roles, users (spec sections 8–10.1)
-- -----------------------------------------------------------------------------

-- Permission keys such as 'students.view' or 'scorm.export' (lib/permissions.ts).
CREATE TABLE permissions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`       VARCHAR(80)  NOT NULL UNIQUE,
  group_key   VARCHAR(40)  NOT NULL,
  label       VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The UI checks permissions, never role names, so custom roles need no code.
CREATE TABLE roles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`       VARCHAR(60)  NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  description TEXT NULL,
  -- Built-in roles can have their permissions edited but can't be deleted.
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Platform roles (Super Admin, national officers) aren't tied to a school.
  scope       ENUM('platform','school') NOT NULL,
  created_at  DATETIME NULL,
  updated_at  DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT rp_role       FOREIGN KEY (role_id)       REFERENCES roles (id)       ON DELETE CASCADE,
  CONSTRAINT rp_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- NULL for platform-level users (Super Admin, national officers).
  school_id           BIGINT UNSIGNED NULL,
  -- Every user has exactly one role (spec section 9).
  role_id             BIGINT UNSIGNED NOT NULL,
  name                VARCHAR(190) NOT NULL,
  email               VARCHAR(190) NULL UNIQUE,
  -- Platform username ('cp' + number): generated, unique platform-wide, never
  -- changed; other products integrate against it (spec section 10.1).
  username            VARCHAR(40)  NOT NULL UNIQUE,
  phone               VARCHAR(20)  NULL,
  password            VARCHAR(255) NOT NULL,
  status              ENUM('active','invited','disabled') NOT NULL DEFAULT 'invited',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  locale              VARCHAR(10)  NOT NULL DEFAULT 'en',   -- interface language: en, fr, pt, es (spec section 50.2)
  timezone            VARCHAR(64)  NULL,                    -- IANA; NULL = the school's timezone
  avatar_color        CHAR(7) NOT NULL DEFAULT '#64748b',
  last_active_at      DATETIME NULL,
  remember_token      VARCHAR(100) NULL,
  created_at          DATETIME NULL,
  updated_at          DATETIME NULL,
  KEY users_school_role_idx (school_id, role_id),
  CONSTRAINT users_school FOREIGN KEY (school_id) REFERENCES schools (id),
  CONSTRAINT users_role   FOREIGN KEY (role_id)   REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
  email      VARCHAR(190) NOT NULL PRIMARY KEY,
  token      VARCHAR(255) NOT NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Academic structure (spec section 6, sections 17–23)
-- -----------------------------------------------------------------------------

CREATE TABLE academic_years (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(20) NOT NULL,           -- "2026/2027"
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY academic_years_school_name (school_id, name),
  CONSTRAINT academic_years_school FOREIGN KEY (school_id) REFERENCES schools (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A semester, term or vacation batch. One per school is 'active' at a time.
CREATE TABLE academic_sessions (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  type             ENUM('semester','term','vacation') NOT NULL,
  name             VARCHAR(60) NOT NULL,       -- "Semester 1", "Term 2", "Batch 3"
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  status           ENUM('active','upcoming','closed') NOT NULL DEFAULT 'upcoming',
  created_at       DATETIME NULL,
  updated_at       DATETIME NULL,
  KEY academic_sessions_school_status_idx (school_id, status),
  CONSTRAINT academic_sessions_school FOREIGN KEY (school_id)        REFERENCES schools (id),
  CONSTRAINT academic_sessions_year   FOREIGN KEY (academic_year_id) REFERENCES academic_years (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vacation Classes run in batches; each batch is a session of the vacation
-- workspace with a registration window and, once closed, a close-out (Section 49.1.7).
CREATE TABLE vacation_batches (
  session_id            BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  number                INT UNSIGNED NOT NULL,
  registration_opens    DATE NULL,
  registration_closes   DATE NULL,
  closed_at             DATETIME NULL,
  closed_by             BIGINT UNSIGNED NULL,
  -- Students keep read-only access until then; NULL = no time limit.
  access_until          DATE NULL,
  students_completed    INT UNSIGNED NULL,
  unpaid_cancelled      INT UNSIGNED NULL,
  teachers_released     INT UNSIGNED NULL,
  teachers_deactivated  INT UNSIGNED NULL,
  reports_sent          BOOLEAN NOT NULL DEFAULT FALSE,
  invited_to_session_id BIGINT UNSIGNED NULL,
  CONSTRAINT vacation_batches_session FOREIGN KEY (session_id)            REFERENCES academic_sessions (id) ON DELETE CASCADE,
  CONSTRAINT vacation_batches_closer  FOREIGN KEY (closed_by)             REFERENCES users (id),
  CONSTRAINT vacation_batches_invited FOREIGN KEY (invited_to_session_id) REFERENCES academic_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A school's request for a programme or subject missing from the catalogue (Section 17.2).
CREATE TABLE catalogue_requests (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id    BIGINT UNSIGNED NOT NULL,
  kind         ENUM('programme','subject') NOT NULL,
  name         VARCHAR(120) NOT NULL,
  code         VARCHAR(20)  NOT NULL,
  description  TEXT NULL,
  reason       TEXT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  status       ENUM('pending','approved','declined') NOT NULL DEFAULT 'pending',
  resolved_at  DATETIME NULL,
  resolved_by  BIGINT UNSIGNED NULL,
  note         TEXT NULL,
  -- The catalogue entry created (or matched) when approved.
  catalogue_programme_id BIGINT UNSIGNED NULL,
  catalogue_subject_id   BIGINT UNSIGNED NULL,
  created_at   DATETIME NULL,
  updated_at   DATETIME NULL,
  KEY catalogue_requests_status_idx (status),
  CONSTRAINT catalogue_requests_school    FOREIGN KEY (school_id)              REFERENCES schools (id),
  CONSTRAINT catalogue_requests_requester FOREIGN KEY (requested_by)           REFERENCES users (id),
  CONSTRAINT catalogue_requests_resolver  FOREIGN KEY (resolved_by)            REFERENCES users (id),
  CONSTRAINT catalogue_requests_programme FOREIGN KEY (catalogue_programme_id) REFERENCES catalogue_programmes (id),
  CONSTRAINT catalogue_requests_subject   FOREIGN KEY (catalogue_subject_id)   REFERENCES catalogue_subjects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE programmes (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id              BIGINT UNSIGNED NOT NULL,
  session_id             BIGINT UNSIGNED NOT NULL,
  catalogue_programme_id BIGINT UNSIGNED NULL,
  name                   VARCHAR(120) NOT NULL,
  code                   VARCHAR(20)  NOT NULL,
  description            TEXT NULL,
  status                 ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at             DATETIME NULL,
  updated_at             DATETIME NULL,
  UNIQUE KEY programmes_session_code (session_id, code),
  KEY programmes_school_idx (school_id),
  CONSTRAINT programmes_school    FOREIGN KEY (school_id)              REFERENCES schools (id),
  CONSTRAINT programmes_session   FOREIGN KEY (session_id)             REFERENCES academic_sessions (id),
  CONSTRAINT programmes_catalogue FOREIGN KEY (catalogue_programme_id) REFERENCES catalogue_programmes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teachers (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                 BIGINT UNSIGNED NOT NULL,
  school_id               BIGINT UNSIGNED NOT NULL,
  -- Staff ID collected from the teacher; also a sign-in name (spec section 10.1).
  staff_number            VARCHAR(40) NOT NULL,
  title                   ENUM('Mr.','Mrs.','Ms.','Dr.','Rev.') NOT NULL,
  first_name              VARCHAR(80) NOT NULL,
  last_name               VARCHAR(80) NOT NULL,
  gender                  ENUM('M','F') NOT NULL,
  specialization          VARCHAR(120) NULL,
  phone                   VARCHAR(20) NULL,
  status                  ENUM('active','on_leave','inactive') NOT NULL DEFAULT 'active',
  -- Granted by a school administrator; recordings are watch-only otherwise.
  can_download_recordings BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              DATETIME NULL,
  updated_at              DATETIME NULL,
  UNIQUE KEY teachers_user_school (user_id, school_id),
  UNIQUE KEY teachers_school_staff (school_id, staff_number),
  KEY teachers_staff_idx (staff_number),
  CONSTRAINT teachers_user   FOREIGN KEY (user_id)   REFERENCES users (id),
  CONSTRAINT teachers_school FOREIGN KEY (school_id) REFERENCES schools (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE classes (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        BIGINT UNSIGNED NOT NULL,
  session_id       BIGINT UNSIGNED NOT NULL,
  programme_id     BIGINT UNSIGNED NOT NULL,
  name             VARCHAR(60) NOT NULL,      -- "SHS 2 Science A"
  level            VARCHAR(30) NOT NULL,      -- "SHS 2"
  class_teacher_id BIGINT UNSIGNED NULL,
  capacity         INT UNSIGNED NOT NULL DEFAULT 45,
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at       DATETIME NULL,
  updated_at       DATETIME NULL,
  UNIQUE KEY classes_session_name (session_id, name),
  KEY classes_school_idx (school_id),
  CONSTRAINT classes_school    FOREIGN KEY (school_id)        REFERENCES schools (id),
  CONSTRAINT classes_session   FOREIGN KEY (session_id)       REFERENCES academic_sessions (id),
  CONSTRAINT classes_programme FOREIGN KEY (programme_id)     REFERENCES programmes (id),
  CONSTRAINT classes_teacher   FOREIGN KEY (class_teacher_id) REFERENCES teachers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subjects (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id            BIGINT UNSIGNED NOT NULL,
  session_id           BIGINT UNSIGNED NOT NULL,
  catalogue_subject_id BIGINT UNSIGNED NULL,
  -- Electives belong to a programme; core subjects don't.
  programme_id         BIGINT UNSIGNED NULL,
  name                 VARCHAR(120) NOT NULL,
  code                 VARCHAR(20)  NOT NULL,
  description          TEXT NULL,
  color                CHAR(7) NOT NULL DEFAULT '#2563eb',
  created_at           DATETIME NULL,
  updated_at           DATETIME NULL,
  UNIQUE KEY subjects_session_code (session_id, code),
  KEY subjects_school_idx (school_id),
  CONSTRAINT subjects_school    FOREIGN KEY (school_id)            REFERENCES schools (id),
  CONSTRAINT subjects_session   FOREIGN KEY (session_id)           REFERENCES academic_sessions (id),
  CONSTRAINT subjects_catalogue FOREIGN KEY (catalogue_subject_id) REFERENCES catalogue_subjects (id),
  CONSTRAINT subjects_programme FOREIGN KEY (programme_id)         REFERENCES programmes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE students (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           BIGINT UNSIGNED NOT NULL,
  -- A school student who also joins Vacation Classes has a second row here,
  -- in the vacation workspace, for the same user (spec section 49.1.1).
  school_id         BIGINT UNSIGNED NOT NULL,
  -- Student ID, e.g. 0010712/260042 (spec section 22.1).
  student_number    VARCHAR(40) NOT NULL,
  -- WAEC code, sequence in the admission year and the year: 0010712-0042-26.
  -- NULL until the school has a WAEC code (spec section 10.1).
  school_username   VARCHAR(40) NULL UNIQUE,
  first_name        VARCHAR(80) NOT NULL,
  last_name         VARCHAR(80) NOT NULL,
  gender            ENUM('M','F') NOT NULL,
  date_of_birth     DATE NULL,
  guardian_name     VARCHAR(190) NULL,
  guardian_phone    VARCHAR(20)  NULL,
  jhs_index_number  CHAR(10) NULL,             -- BECE index, digits only
  admission_year    SMALLINT UNSIGNED NULL,
  -- JHS index + two-digit admission year (12 digits), unique platform-wide.
  index_number      CHAR(12) NULL UNIQUE,
  status            ENUM('active','withdrawn','graduated') NOT NULL DEFAULT 'active',
  created_at        DATETIME NULL,
  updated_at        DATETIME NULL,
  UNIQUE KEY students_user_school (user_id, school_id),
  UNIQUE KEY students_school_number (school_id, student_number),
  CONSTRAINT students_user   FOREIGN KEY (user_id)   REFERENCES users (id),
  CONSTRAINT students_school FOREIGN KEY (school_id) REFERENCES schools (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parents and guardians (spec section 22.3). The parent is a user with the 'guardian'
-- role in the student's school; one account follows all their children there.
-- Parents see a read-only report of each ward and nothing else.
CREATE TABLE guardian_links (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         BIGINT UNSIGNED NOT NULL,
  guardian_user_id  BIGINT UNSIGNED NOT NULL,
  student_id        BIGINT UNSIGNED NOT NULL,
  relationship      ENUM('mother','father','guardian','other') NOT NULL DEFAULT 'guardian',
  created_at        DATETIME NULL,
  UNIQUE KEY guardian_links_pair (guardian_user_id, student_id),
  KEY guardian_links_student_idx (student_id),
  CONSTRAINT guardian_links_school   FOREIGN KEY (school_id)        REFERENCES schools (id),
  CONSTRAINT guardian_links_user     FOREIGN KEY (guardian_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT guardian_links_student  FOREIGN KEY (student_id)       REFERENCES students (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ClassProject Open recommendations (spec section 49.2): subjects a student is interested
-- in beyond their own ('interest'), and own subjects they don't want suggestions
-- for ('hidden'). Codes are catalogue subject codes. The recommended courses
-- themselves come from Open's partner API and aren't stored.
CREATE TABLE student_subject_interests (
  student_id   BIGINT UNSIGNED NOT NULL,
  subject_code VARCHAR(20) NOT NULL,
  kind         ENUM('interest','hidden') NOT NULL,
  created_at   DATETIME NULL,
  PRIMARY KEY (student_id, subject_code, kind),
  CONSTRAINT student_subject_interests_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which class a student is in for a session.
CREATE TABLE class_placements (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  BIGINT UNSIGNED NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  class_id   BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NULL,
  UNIQUE KEY class_placements_session_student (session_id, student_id),
  KEY class_placements_class_idx (class_id),
  CONSTRAINT class_placements_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT class_placements_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id),
  CONSTRAINT class_placements_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT class_placements_class   FOREIGN KEY (class_id)   REFERENCES classes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher ↔ subject ↔ class (spec section 20): one teacher per subject per class.
CREATE TABLE teaching_assignments (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  BIGINT UNSIGNED NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  class_id   BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NULL,
  UNIQUE KEY teaching_assignments_subject_class (session_id, subject_id, class_id),
  KEY teaching_assignments_teacher_idx (teacher_id, session_id),
  CONSTRAINT teaching_assignments_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT teaching_assignments_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id),
  CONSTRAINT teaching_assignments_subject FOREIGN KEY (subject_id) REFERENCES subjects (id),
  CONSTRAINT teaching_assignments_class   FOREIGN KEY (class_id)   REFERENCES classes (id),
  CONSTRAINT teaching_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student subject registration (spec section 21).
CREATE TABLE enrollments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   BIGINT UNSIGNED NOT NULL,
  session_id  BIGINT UNSIGNED NOT NULL,
  student_id  BIGINT UNSIGNED NOT NULL,
  class_id    BIGINT UNSIGNED NOT NULL,
  subject_id  BIGINT UNSIGNED NOT NULL,
  enrolled_at DATETIME NOT NULL,
  UNIQUE KEY enrollments_student_subject (session_id, student_id, subject_id),
  KEY enrollments_class_subject_idx (class_id, subject_id),
  CONSTRAINT enrollments_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT enrollments_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id),
  CONSTRAINT enrollments_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT enrollments_class   FOREIGN KEY (class_id)   REFERENCES classes (id),
  CONSTRAINT enrollments_subject FOREIGN KEY (subject_id) REFERENCES subjects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Files (uploads, submissions, recordings, SCORM packages)
-- -----------------------------------------------------------------------------

-- Every uploaded file lives in storage; rows point at it here. Files open
-- in-app, with new tab and download as options (spec section 27).
CREATE TABLE files (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id   BIGINT UNSIGNED NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  disk        VARCHAR(30)  NOT NULL DEFAULT 's3',
  path        VARCHAR(500) NOT NULL,
  name        VARCHAR(255) NOT NULL,          -- original file name
  mime_type   VARCHAR(120) NOT NULL,
  size_bytes  BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME NULL,
  KEY files_school_idx (school_id),
  CONSTRAINT files_school   FOREIGN KEY (school_id)   REFERENCES schools (id),
  CONSTRAINT files_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. LMS: courses, sections, content, outcomes, progress (spec sections 24–26)
-- -----------------------------------------------------------------------------

-- A course is one subject taught to one class in one session.
CREATE TABLE courses (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id     BIGINT UNSIGNED NOT NULL,
  session_id    BIGINT UNSIGNED NOT NULL,
  subject_id    BIGINT UNSIGNED NOT NULL,
  class_id      BIGINT UNSIGNED NOT NULL,
  teacher_id    BIGINT UNSIGNED NOT NULL,
  title         VARCHAR(190) NOT NULL,
  description   TEXT NULL,
  -- What the teacher calls the course's sections.
  section_label ENUM('Section','Module','Topic','Week','Unit') NOT NULL DEFAULT 'Section',
  created_at    DATETIME NULL,
  updated_at    DATETIME NULL,
  UNIQUE KEY courses_subject_class (session_id, subject_id, class_id),
  KEY courses_teacher_idx (teacher_id, session_id),
  KEY courses_school_idx (school_id),
  CONSTRAINT courses_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT courses_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id),
  CONSTRAINT courses_subject FOREIGN KEY (subject_id) REFERENCES subjects (id),
  CONSTRAINT courses_class   FOREIGN KEY (class_id)   REFERENCES classes (id),
  CONSTRAINT courses_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Published + available_from in the future = scheduled release (spec section 25).
CREATE TABLE course_modules (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id      BIGINT UNSIGNED NOT NULL,
  title          VARCHAR(190) NOT NULL,
  description    TEXT NULL,
  position       INT UNSIGNED NOT NULL DEFAULT 0,
  published      BOOLEAN NOT NULL DEFAULT FALSE,
  available_from DATETIME NULL,
  created_at     DATETIME NULL,
  updated_at     DATETIME NULL,
  KEY course_modules_course_idx (course_id, position),
  CONSTRAINT course_modules_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One item in a section. assessment_id / live_session_id / recording_id link
-- the item to its record for those types, and video_id a video lesson to its
-- video asset (foreign keys added in section 14).
CREATE TABLE content_items (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module_id            BIGINT UNSIGNED NOT NULL,
  course_id            BIGINT UNSIGNED NOT NULL,
  type                 ENUM('text','video','pdf','ebook','presentation','assignment','quiz','assessment','link','file','live','recording','scorm') NOT NULL,
  title                VARCHAR(190) NOT NULL,
  description          TEXT NULL,
  body                 MEDIUMTEXT NULL,          -- text lessons
  url                  VARCHAR(1000) NULL,       -- links, embedded video
  file_id              BIGINT UNSIGNED NULL,     -- uploaded document, video or SCORM zip
  duration_minutes     INT UNSIGNED NULL,
  assessment_id        BIGINT UNSIGNED NULL,
  live_session_id      BIGINT UNSIGNED NULL,
  recording_id         BIGINT UNSIGNED NULL,
  video_id             BIGINT UNSIGNED NULL,     -- interactive video lessons (section 7b)
  position             INT UNSIGNED NOT NULL DEFAULT 0,
  published            BOOLEAN NOT NULL DEFAULT FALSE,
  available_from       DATETIME NULL,
  -- Learning outcomes / indicators (spec section 25.2): who last saved them, when.
  outcomes_updated_at  DATETIME NULL,
  outcomes_updated_by  BIGINT UNSIGNED NULL,
  created_at           DATETIME NULL,
  updated_at           DATETIME NULL,
  KEY content_items_module_idx (module_id, position),
  KEY content_items_course_type_idx (course_id, type),
  CONSTRAINT content_items_module   FOREIGN KEY (module_id)           REFERENCES course_modules (id) ON DELETE CASCADE,
  CONSTRAINT content_items_course   FOREIGN KEY (course_id)           REFERENCES courses (id)        ON DELETE CASCADE,
  CONSTRAINT content_items_file     FOREIGN KEY (file_id)             REFERENCES files (id)          ON DELETE SET NULL,
  CONSTRAINT content_items_outcomes FOREIGN KEY (outcomes_updated_by) REFERENCES users (id)          ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The teacher's learning outcomes and learning indicators for a lesson, one
-- per row in the teacher's order. Staff only: never returned to students.
CREATE TABLE content_learning_statements (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT UNSIGNED NOT NULL,
  kind       ENUM('outcome','indicator') NOT NULL,
  position   INT UNSIGNED NOT NULL,
  text       TEXT NOT NULL,
  KEY content_learning_statements_content_idx (content_id, kind, position),
  CONSTRAINT cls_content FOREIGN KEY (content_id) REFERENCES content_items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The ClassProject library (spec section 25.3): learning materials the Super
-- Administrator publishes for a catalogue subject at one level. Every class at
-- that level taking the subject — in every school — sees them in its course.
CREATE TABLE library_topics (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  catalogue_subject_id BIGINT UNSIGNED NOT NULL,
  level_code           VARCHAR(10)  NOT NULL,            -- BASIC1–BASIC6, JHS1–JHS3, SHS1–SHS3
  title                VARCHAR(190) NOT NULL,
  description          TEXT NULL,
  position             INT UNSIGNED NOT NULL DEFAULT 0,
  published            BOOLEAN NOT NULL DEFAULT TRUE,
  created_by           BIGINT UNSIGNED NULL,
  created_at           DATETIME NULL,
  updated_at           DATETIME NULL,
  KEY library_topics_subject_level_idx (catalogue_subject_id, level_code, position),
  CONSTRAINT library_topics_subject FOREIGN KEY (catalogue_subject_id) REFERENCES catalogue_subjects (id),
  CONSTRAINT library_topics_creator FOREIGN KEY (created_by)           REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE library_materials (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic_id         BIGINT UNSIGNED NOT NULL,
  type             ENUM('text','video','pdf','presentation','ebook','link','file') NOT NULL,
  title            VARCHAR(190) NOT NULL,
  description      TEXT NULL,
  body             MEDIUMTEXT NULL,
  url              VARCHAR(1000) NULL,
  file_id          BIGINT UNSIGNED NULL,
  duration_minutes INT UNSIGNED NULL,
  position         INT UNSIGNED NOT NULL DEFAULT 0,
  published        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       BIGINT UNSIGNED NULL,
  created_at       DATETIME NULL,
  updated_at       DATETIME NULL,
  KEY library_materials_topic_idx (topic_id, position),
  CONSTRAINT library_materials_topic   FOREIGN KEY (topic_id)   REFERENCES library_topics (id) ON DELETE CASCADE,
  CONSTRAINT library_materials_file    FOREIGN KEY (file_id)    REFERENCES files (id)          ON DELETE SET NULL,
  CONSTRAINT library_materials_creator FOREIGN KEY (created_by) REFERENCES users (id)          ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A student completed a library material (library items count in course progress).
CREATE TABLE library_progress (
  student_id   BIGINT UNSIGNED NOT NULL,
  material_id  BIGINT UNSIGNED NOT NULL,
  completed_at DATETIME NOT NULL,
  PRIMARY KEY (student_id, material_id),
  CONSTRAINT library_progress_student  FOREIGN KEY (student_id)  REFERENCES students (id)          ON DELETE CASCADE,
  CONSTRAINT library_progress_material FOREIGN KEY (material_id) REFERENCES library_materials (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A student marked a lesson complete.
CREATE TABLE lesson_progress (
  student_id   BIGINT UNSIGNED NOT NULL,
  content_id   BIGINT UNSIGNED NOT NULL,
  completed_at DATETIME NOT NULL,
  PRIMARY KEY (student_id, content_id),
  KEY lesson_progress_content_idx (content_id),
  CONSTRAINT lesson_progress_student FOREIGN KEY (student_id) REFERENCES students (id)      ON DELETE CASCADE,
  CONSTRAINT lesson_progress_content FOREIGN KEY (content_id) REFERENCES content_items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. SCORM 1.2 / 2004 (spec section 26.2)
-- -----------------------------------------------------------------------------

-- A SCORM package as read from its imsmanifest.xml; the zip is content_items.file_id.
CREATE TABLE scorm_packages (
  content_id     BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  version        ENUM('1.2','2004') NOT NULL,
  version_label  VARCHAR(60)  NOT NULL,          -- "SCORM 2004 4th Edition"
  identifier     VARCHAR(190) NOT NULL,          -- manifest identifier
  -- Where the unpacked package is served from.
  extracted_path VARCHAR(500) NULL,
  -- The package's score is recorded in the gradebook (spec section 26.2).
  counts_in_gradebook BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT scorm_packages_content FOREIGN KEY (content_id) REFERENCES content_items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The launchable items (SCOs and assets) in the package, in manifest order.
CREATE TABLE scorm_scos (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id           BIGINT UNSIGNED NOT NULL,
  sco_identifier       VARCHAR(190) NOT NULL,
  title                VARCHAR(255) NOT NULL,
  href                 VARCHAR(500) NOT NULL,
  position             INT UNSIGNED NOT NULL,
  is_asset             BOOLEAN NOT NULL DEFAULT FALSE,
  mastery_score        DECIMAL(5,2) NULL,        -- SCORM 1.2 adlcp:masteryscore
  scaled_passing_score DECIMAL(5,4) NULL,        -- SCORM 2004 imsss:minNormalizedMeasure
  completion_threshold DECIMAL(5,4) NULL,
  launch_data          TEXT NULL,
  UNIQUE KEY scorm_scos_identifier (content_id, sco_identifier),
  CONSTRAINT scorm_scos_package FOREIGN KEY (content_id) REFERENCES scorm_packages (content_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One learner's run-time data for one SCO: the full CMI data model exactly as
-- the SCO set it (cmi.suspend_data, cmi.interactions.n.*…), plus the results.
CREATE TABLE scorm_attempts (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         BIGINT UNSIGNED NOT NULL,
  course_id         BIGINT UNSIGNED NOT NULL,
  content_id        BIGINT UNSIGNED NOT NULL,
  sco_id            BIGINT UNSIGNED NOT NULL,
  student_id        BIGINT UNSIGNED NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  version           ENUM('1.2','2004') NOT NULL,
  cmi               JSON NOT NULL,
  completion_status ENUM('not attempted','incomplete','completed','unknown') NOT NULL DEFAULT 'not attempted',
  success_status    ENUM('passed','failed','unknown') NOT NULL DEFAULT 'unknown',
  score_percent     DECIMAL(5,2) NULL,
  total_seconds     INT UNSIGNED NOT NULL DEFAULT 0,
  sessions          INT UNSIGNED NOT NULL DEFAULT 0,
  first_launched_at DATETIME NOT NULL,
  completed_at      DATETIME NULL,
  updated_at        DATETIME NOT NULL,
  UNIQUE KEY scorm_attempts_learner_sco (sco_id, student_id),
  KEY scorm_attempts_content_idx (content_id),
  KEY scorm_attempts_course_idx (course_id),
  CONSTRAINT scorm_attempts_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT scorm_attempts_course  FOREIGN KEY (course_id)  REFERENCES courses (id)       ON DELETE CASCADE,
  CONSTRAINT scorm_attempts_content FOREIGN KEY (content_id) REFERENCES content_items (id) ON DELETE CASCADE,
  CONSTRAINT scorm_attempts_sco     FOREIGN KEY (sco_id)     REFERENCES scorm_scos (id)    ON DELETE CASCADE,
  CONSTRAINT scorm_attempts_student FOREIGN KEY (student_id) REFERENCES students (id)      ON DELETE CASCADE,
  CONSTRAINT scorm_attempts_user    FOREIGN KEY (user_id)    REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7b. Interactive video (spec section 26.3)
-- -----------------------------------------------------------------------------
-- The video stays an ordinary asset; its questions live here as timestamped
-- rows. Nothing is burnt into the file, so one video can carry different
-- questions in different courses, and a course can publish a new version of
-- its questions without touching earlier results:
--   video_assets ─< video_interaction_sets (one per lesson, versioned)
--                     ─< video_interactions ─< video_interaction_options
--   students answer → video_interaction_attempts (+ the options they chose)
--   students watch  → video_progress, video_interaction_encounters
-- Every answer is scored by the server from the stored configuration; the
-- browser's own idea of "correct" or "points" is never accepted.

-- A video that lessons can use: an uploaded file or a YouTube / Vimeo video.
-- Owned by one school; any of its courses can reuse it.
CREATE TABLE video_assets (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        BIGINT UNSIGNED NOT NULL,
  title            VARCHAR(190) NOT NULL,
  description      TEXT NULL,
  provider         ENUM('file','youtube','vimeo') NOT NULL,
  file_id          BIGINT UNSIGNED NULL,            -- provider = file
  url              VARCHAR(1000) NULL,              -- the file's address, or the YouTube / Vimeo link
  provider_ref     VARCHAR(64) NULL,                -- the YouTube / Vimeo video id
  duration_seconds DECIMAL(9,3) NOT NULL,           -- interaction timestamps are checked against it
  thumbnail_url    VARCHAR(1000) NULL,
  -- What is said in the video. Read by question suggestion (AI) and shown as
  -- a transcript for students who can't listen.
  transcript       MEDIUMTEXT NULL,
  status           ENUM('processing','ready','failed') NOT NULL DEFAULT 'ready',
  created_by       BIGINT UNSIGNED NULL,
  created_at       DATETIME NULL,
  updated_at       DATETIME NULL,
  KEY video_assets_school_idx (school_id),
  UNIQUE KEY video_assets_provider_ref (school_id, provider, provider_ref),
  CONSTRAINT video_assets_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT video_assets_file    FOREIGN KEY (file_id)    REFERENCES files (id) ON DELETE SET NULL,
  CONSTRAINT video_assets_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Captions / subtitles, one row per language (WebVTT).
CREATE TABLE video_caption_tracks (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  video_id   BIGINT UNSIGNED NOT NULL,
  language   VARCHAR(10)  NOT NULL,                 -- BCP 47: en, fr, pt, es
  label      VARCHAR(60)  NOT NULL,
  file_id    BIGINT UNSIGNED NULL,
  url        VARCHAR(1000) NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY video_caption_tracks_language (video_id, language),
  CONSTRAINT video_caption_tracks_video FOREIGN KEY (video_id) REFERENCES video_assets (id) ON DELETE CASCADE,
  CONSTRAINT video_caption_tracks_file  FOREIGN KEY (file_id)  REFERENCES files (id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The questions one lesson (content item) puts on a video. Teachers edit a
-- draft; publishing it archives the version students were using. At most one
-- published set per lesson: published_slot is 1 only while published (NULL
-- otherwise, and NULLs never clash), so the unique key enforces it.
CREATE TABLE video_interaction_sets (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id            BIGINT UNSIGNED NOT NULL,
  course_id            BIGINT UNSIGNED NOT NULL,
  content_id           BIGINT UNSIGNED NOT NULL,
  video_id             BIGINT UNSIGNED NOT NULL,
  version              INT UNSIGNED NOT NULL,
  status               ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_slot       TINYINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'published' THEN 1 END) STORED,
  -- Students can't seek past a required question they haven't answered.
  prevent_skipping     BOOLEAN NOT NULL DEFAULT TRUE,
  -- How much of the video must be watched (with every required question
  -- answered) for the lesson to count as complete.
  completion_percent   TINYINT UNSIGNED NOT NULL DEFAULT 90,
  based_on_set_id      BIGINT UNSIGNED NULL,        -- the version this draft was copied from
  created_by           BIGINT UNSIGNED NULL,
  published_by         BIGINT UNSIGNED NULL,
  published_at         DATETIME NULL,
  created_at           DATETIME NULL,
  updated_at           DATETIME NULL,
  UNIQUE KEY video_interaction_sets_version (content_id, version),
  UNIQUE KEY video_interaction_sets_one_published (content_id, published_slot),
  KEY video_interaction_sets_video_idx (video_id),
  KEY video_interaction_sets_course_idx (course_id),
  CONSTRAINT vis_school    FOREIGN KEY (school_id)       REFERENCES schools (id),
  CONSTRAINT vis_course    FOREIGN KEY (course_id)       REFERENCES courses (id)                ON DELETE CASCADE,
  CONSTRAINT vis_content   FOREIGN KEY (content_id)      REFERENCES content_items (id)          ON DELETE CASCADE,
  CONSTRAINT vis_video     FOREIGN KEY (video_id)        REFERENCES video_assets (id),
  CONSTRAINT vis_based_on  FOREIGN KEY (based_on_set_id) REFERENCES video_interaction_sets (id) ON DELETE SET NULL,
  CONSTRAINT vis_creator   FOREIGN KEY (created_by)      REFERENCES users (id)                  ON DELETE SET NULL,
  CONSTRAINT vis_publisher FOREIGN KEY (published_by)    REFERENCES users (id)                  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One question, poll or checkpoint at a moment in the video.
CREATE TABLE video_interactions (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  set_id                BIGINT UNSIGNED NOT NULL,
  -- New types are added here and in lib/interactive-video/engine.ts.
  type                  ENUM('mcq','true_false','multi_select','poll','short_answer') NOT NULL,
  timestamp_seconds     DECIMAL(9,3) NOT NULL,  -- 0 to the video's duration
  position              INT UNSIGNED NOT NULL DEFAULT 0, -- order among interactions at the same moment
  title                 VARCHAR(190) NULL,               -- overlay heading; "Quick check" when empty
  question              TEXT NOT NULL,
  description           TEXT NULL,
  explanation           TEXT NULL,                       -- shown with the feedback
  model_answer          TEXT NULL,                       -- short answer: what the teacher looks for
  points                DECIMAL(6,2) NOT NULL DEFAULT 1,  -- 0 for polls
  required              BOOLEAN NOT NULL DEFAULT TRUE,
  allow_retry           BOOLEAN NOT NULL DEFAULT TRUE,
  max_attempts          SMALLINT UNSIGNED NULL,          -- NULL = unlimited; ignored without retry
  show_feedback         BOOLEAN NOT NULL DEFAULT TRUE,
  pause_video           BOOLEAN NOT NULL DEFAULT TRUE,
  resume_after_submit   BOOLEAN NOT NULL DEFAULT FALSE,  -- carry on playing without "Continue"
  display_position      ENUM('center','bottom','side') NOT NULL DEFAULT 'center',
  -- Who wrote it. AI suggestions only get here once a teacher accepts them.
  source                ENUM('teacher','ai') NOT NULL DEFAULT 'teacher',
  -- The concept it checks, for mastery and review recommendations later.
  outcome_statement_id  BIGINT UNSIGNED NULL,
  concept               VARCHAR(190) NULL,
  created_at            DATETIME NULL,
  updated_at            DATETIME NULL,
  KEY video_interactions_set_time_idx (set_id, timestamp_seconds, position),
  CONSTRAINT video_interactions_set     FOREIGN KEY (set_id)               REFERENCES video_interaction_sets (id)      ON DELETE CASCADE,
  CONSTRAINT video_interactions_outcome FOREIGN KEY (outcome_statement_id) REFERENCES content_learning_statements (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Answer options. True / false questions have two rows (True, False).
CREATE TABLE video_interaction_options (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  interaction_id BIGINT UNSIGNED NOT NULL,
  position       INT UNSIGNED NOT NULL,
  option_text    VARCHAR(500) NOT NULL,
  is_correct     BOOLEAN NOT NULL DEFAULT FALSE,     -- always FALSE for polls
  feedback       TEXT NULL,                           -- why this option is right or wrong
  created_at     DATETIME NULL,
  updated_at     DATETIME NULL,
  KEY video_interaction_options_idx (interaction_id, position),
  CONSTRAINT vio_interaction FOREIGN KEY (interaction_id) REFERENCES video_interactions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One submitted answer. attempt_number counts from 1 per student and
-- question; the unique keys make a double click or a retried request land on
-- the same row instead of using up an attempt (client_attempt_id is a UUID
-- the browser makes once per answer and resends on retry).
CREATE TABLE video_interaction_attempts (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         BIGINT UNSIGNED NOT NULL,
  set_id            BIGINT UNSIGNED NOT NULL,
  interaction_id    BIGINT UNSIGNED NOT NULL,
  student_id        BIGINT UNSIGNED NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  attempt_number    SMALLINT UNSIGNED NOT NULL,
  client_attempt_id CHAR(36) NOT NULL,
  answer_text       TEXT NULL,                       -- short answer; options are in the next table
  -- Set by the server: NULL for polls and for short answers until reviewed.
  is_correct        BOOLEAN NULL,
  points_earned     DECIMAL(6,2) NULL,
  points_possible   DECIMAL(6,2) NOT NULL,           -- the question's points when answered
  review_status     ENUM('auto','pending','reviewed') NOT NULL DEFAULT 'auto',
  reviewed_by       BIGINT UNSIGNED NULL,
  reviewed_at       DATETIME NULL,
  review_feedback   TEXT NULL,
  -- Where the student was in the video, and how long they took to answer.
  video_seconds     DECIMAL(9,3) NULL,
  response_ms       INT UNSIGNED NULL,
  started_at        DATETIME NULL,                   -- when the question appeared
  submitted_at      DATETIME NOT NULL,
  UNIQUE KEY video_attempts_number (interaction_id, student_id, attempt_number),
  UNIQUE KEY video_attempts_client (interaction_id, student_id, client_attempt_id),
  KEY video_attempts_set_student_idx (set_id, student_id),
  KEY video_attempts_review_idx (review_status, set_id),
  CONSTRAINT via_school      FOREIGN KEY (school_id)      REFERENCES schools (id),
  CONSTRAINT via_set         FOREIGN KEY (set_id)         REFERENCES video_interaction_sets (id) ON DELETE CASCADE,
  CONSTRAINT via_interaction FOREIGN KEY (interaction_id) REFERENCES video_interactions (id)     ON DELETE CASCADE,
  CONSTRAINT via_student     FOREIGN KEY (student_id)     REFERENCES students (id)               ON DELETE CASCADE,
  CONSTRAINT via_user        FOREIGN KEY (user_id)        REFERENCES users (id),
  CONSTRAINT via_reviewer    FOREIGN KEY (reviewed_by)    REFERENCES users (id)                  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The options a student picked in an attempt (one for MCQ, true / false and
-- polls; several for multiple select). Drives "most selected wrong answer".
CREATE TABLE video_interaction_attempt_options (
  attempt_id BIGINT UNSIGNED NOT NULL,
  option_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (attempt_id, option_id),
  KEY viao_option_idx (option_id),
  CONSTRAINT viao_attempt FOREIGN KEY (attempt_id) REFERENCES video_interaction_attempts (id) ON DELETE CASCADE,
  CONSTRAINT viao_option  FOREIGN KEY (option_id)  REFERENCES video_interaction_options (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A question reached the screen for a student, and whether they skipped it
-- (optional questions only). Counts "encountered" and "skipped".
CREATE TABLE video_interaction_encounters (
  interaction_id BIGINT UNSIGNED NOT NULL,
  student_id     BIGINT UNSIGNED NOT NULL,
  first_shown_at DATETIME NOT NULL,
  skipped_at     DATETIME NULL,
  PRIMARY KEY (interaction_id, student_id),
  KEY vie_student_idx (student_id),
  CONSTRAINT vie_interaction FOREIGN KEY (interaction_id) REFERENCES video_interactions (id) ON DELETE CASCADE,
  CONSTRAINT vie_student     FOREIGN KEY (student_id)     REFERENCES students (id)           ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One student's progress through one version of a lesson's questions. Saved
-- every ~15 seconds of playback and on pause, seek, end and leaving the page,
-- never every second. The counts are a summary the server keeps up to date
-- from the attempts and encounters, so reports don't recount them.
CREATE TABLE video_progress (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id             BIGINT UNSIGNED NOT NULL,
  set_id                BIGINT UNSIGNED NOT NULL,
  content_id            BIGINT UNSIGNED NOT NULL,
  student_id            BIGINT UNSIGNED NOT NULL,
  started_at            DATETIME NOT NULL,
  last_position_seconds DECIMAL(9,3) NOT NULL DEFAULT 0,  -- where "Resume" starts
  furthest_seconds      DECIMAL(9,3) NOT NULL DEFAULT 0,
  watch_seconds         INT UNSIGNED NOT NULL DEFAULT 0,  -- time spent playing, rewatches included
  -- The parts of the video actually played, as merged [start, end] pairs in
  -- seconds. Completion % is their total length over the duration, so
  -- skipping to the end doesn't count as watching.
  watched_ranges        JSON NOT NULL,
  completion_percent    DECIMAL(5,2) NOT NULL DEFAULT 0,
  interactions_total    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  encountered_count     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  completed_count       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  skipped_count         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  correct_count         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  incorrect_count       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  attempts_count        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score_points          DECIMAL(8,2) NOT NULL DEFAULT 0,
  max_points            DECIMAL(8,2) NOT NULL DEFAULT 0,
  status                ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
  completed_at          DATETIME NULL,
  last_activity_at      DATETIME NOT NULL,
  UNIQUE KEY video_progress_student (set_id, student_id),
  KEY video_progress_content_idx (content_id, status),
  KEY video_progress_student_idx (student_id),
  CONSTRAINT vp_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT vp_set     FOREIGN KEY (set_id)     REFERENCES video_interaction_sets (id) ON DELETE CASCADE,
  CONSTRAINT vp_content FOREIGN KEY (content_id) REFERENCES content_items (id)          ON DELETE CASCADE,
  CONSTRAINT vp_student FOREIGN KEY (student_id) REFERENCES students (id)               ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Questions suggested by a generator (an AI reading the transcript). They
-- never reach students on their own: a teacher accepts one into a draft
-- (it becomes a video_interactions row with source = 'ai'), edits it, and
-- publishes the draft.
CREATE TABLE video_interaction_suggestions (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         BIGINT UNSIGNED NOT NULL,
  video_id          BIGINT UNSIGNED NOT NULL,
  set_id            BIGINT UNSIGNED NULL,            -- the draft it was requested for
  generator         VARCHAR(60) NOT NULL,            -- which generator / model wrote it
  status            ENUM('pending','accepted','dismissed') NOT NULL DEFAULT 'pending',
  -- The suggested question in the same shape as an interaction with its
  -- options; only copied into real rows when accepted.
  suggestion        JSON NOT NULL,
  rationale         TEXT NULL,                       -- the part of the transcript it came from
  requested_by      BIGINT UNSIGNED NULL,
  decided_by        BIGINT UNSIGNED NULL,
  decided_at        DATETIME NULL,
  accepted_as_id    BIGINT UNSIGNED NULL,
  created_at        DATETIME NULL,
  KEY video_suggestions_video_idx (video_id, status),
  CONSTRAINT vsug_school    FOREIGN KEY (school_id)      REFERENCES schools (id),
  CONSTRAINT vsug_video     FOREIGN KEY (video_id)       REFERENCES video_assets (id)           ON DELETE CASCADE,
  CONSTRAINT vsug_set       FOREIGN KEY (set_id)         REFERENCES video_interaction_sets (id) ON DELETE SET NULL,
  CONSTRAINT vsug_requester FOREIGN KEY (requested_by)   REFERENCES users (id)                  ON DELETE SET NULL,
  CONSTRAINT vsug_decider   FOREIGN KEY (decided_by)     REFERENCES users (id)                  ON DELETE SET NULL,
  CONSTRAINT vsug_accepted  FOREIGN KEY (accepted_as_id) REFERENCES video_interactions (id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Learning events (xAPI-style "student – verb – object"), written alongside
-- attempts and progress. Nothing reads them for decisions yet: they are the
-- feed a mastery model and spaced-repetition review will use, keyed by the
-- concept / learning outcome each question checks.
CREATE TABLE learning_events (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id            BIGINT UNSIGNED NOT NULL,
  student_id           BIGINT UNSIGNED NOT NULL,
  course_id            BIGINT UNSIGNED NULL,
  content_id           BIGINT UNSIGNED NULL,
  verb                 ENUM('started','answered','skipped','reviewed','completed') NOT NULL,
  object_type          ENUM('video','video_interaction') NOT NULL,
  object_id            BIGINT UNSIGNED NOT NULL,
  outcome_statement_id BIGINT UNSIGNED NULL,
  concept              VARCHAR(190) NULL,
  is_correct           BOOLEAN NULL,
  score                DECIMAL(8,2) NULL,
  max_score            DECIMAL(8,2) NULL,
  attempt_number       SMALLINT UNSIGNED NULL,
  response_ms          INT UNSIGNED NULL,
  occurred_at          DATETIME NOT NULL,
  KEY learning_events_student_idx (student_id, occurred_at),
  KEY learning_events_concept_idx (school_id, concept),
  KEY learning_events_object_idx (object_type, object_id),
  CONSTRAINT le_school  FOREIGN KEY (school_id)            REFERENCES schools (id),
  CONSTRAINT le_student FOREIGN KEY (student_id)           REFERENCES students (id)                    ON DELETE CASCADE,
  CONSTRAINT le_course  FOREIGN KEY (course_id)            REFERENCES courses (id)                     ON DELETE SET NULL,
  CONSTRAINT le_content FOREIGN KEY (content_id)           REFERENCES content_items (id)               ON DELETE SET NULL,
  CONSTRAINT le_outcome FOREIGN KEY (outcome_statement_id) REFERENCES content_learning_statements (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Assessments and the gradebook (spec sections 35–38)
-- -----------------------------------------------------------------------------

CREATE TABLE assessments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id         BIGINT UNSIGNED NOT NULL,
  session_id        BIGINT UNSIGNED NOT NULL,
  course_id         BIGINT UNSIGNED NOT NULL,
  subject_id        BIGINT UNSIGNED NOT NULL,
  class_id          BIGINT UNSIGNED NOT NULL,
  teacher_id        BIGINT UNSIGNED NOT NULL,
  title             VARCHAR(190) NOT NULL,
  description       TEXT NULL,
  type              ENUM('quiz','assignment','test','project','examination') NOT NULL,
  total_marks       DECIMAL(7,2) NOT NULL,
  duration_minutes  INT UNSIGNED NULL,
  due_at            DATETIME NOT NULL,
  status            ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
  shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
  shuffle_options   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Set when this grade item records a SCORM package's score; it then has no
  -- questions of its own.
  scorm_content_id  BIGINT UNSIGNED NULL UNIQUE,
  created_at        DATETIME NULL,
  updated_at        DATETIME NULL,
  KEY assessments_course_idx (course_id, status),
  KEY assessments_class_session_idx (class_id, session_id),
  KEY assessments_school_idx (school_id),
  CONSTRAINT assessments_school  FOREIGN KEY (school_id)        REFERENCES schools (id),
  CONSTRAINT assessments_session FOREIGN KEY (session_id)       REFERENCES academic_sessions (id),
  CONSTRAINT assessments_course  FOREIGN KEY (course_id)        REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT assessments_subject FOREIGN KEY (subject_id)       REFERENCES subjects (id),
  CONSTRAINT assessments_class   FOREIGN KEY (class_id)         REFERENCES classes (id),
  CONSTRAINT assessments_teacher FOREIGN KEY (teacher_id)       REFERENCES teachers (id),
  CONSTRAINT assessments_scorm   FOREIGN KEY (scorm_content_id) REFERENCES content_items (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Twelve question types (spec section 37; lib/questions.ts for how each is marked).
-- options / answers / distractors / option_images / pairs vary by type, so
-- they're JSON in the same shape the question builder uses.
CREATE TABLE assessment_questions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id BIGINT UNSIGNED NOT NULL,
  position      INT UNSIGNED NOT NULL,
  type          ENUM('mcq','multi_select','true_false','fill_blank','numeric','matching','ordering','drag_words','short_answer','long_answer','essay','file') NOT NULL,
  prompt        TEXT NOT NULL,
  marks         DECIMAL(6,2) NOT NULL,
  options       JSON NULL,       -- choices (mcq, multi_select) or items in correct order (ordering)
  answer        TEXT NULL,       -- option index, "true"/"false", accepted text ("a|b"), or a number
  answers       JSON NULL,       -- correct option indices (multi_select) or blank words (drag_words)
  distractors   JSON NULL,       -- extra wrong words (drag_words)
  tolerance     DECIMAL(12,4) NULL,  -- accepted ± for numeric
  image_file_id BIGINT UNSIGNED NULL,
  image_alt     VARCHAR(500) NULL,
  option_images JSON NULL,       -- file ids parallel to options
  pairs         JSON NULL,       -- [{left, right}] (matching)
  KEY assessment_questions_assessment_idx (assessment_id, position),
  CONSTRAINT aq_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
  CONSTRAINT aq_image      FOREIGN KEY (image_file_id) REFERENCES files (id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A student's submission; its score is the gradebook entry (spec section 38). SCORM
-- grade items get one submission per learner holding the best score.
CREATE TABLE submissions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id BIGINT UNSIGNED NOT NULL,
  student_id    BIGINT UNSIGNED NOT NULL,
  submitted_at  DATETIME NOT NULL,
  file_id       BIGINT UNSIGNED NULL,     -- uploaded work (assignments)
  text          MEDIUMTEXT NULL,          -- typed work
  score         DECIMAL(7,2) NULL,        -- NULL until graded
  feedback      TEXT NULL,
  graded_at     DATETIME NULL,
  graded_by     BIGINT UNSIGNED NULL,
  status        ENUM('submitted','graded','late') NOT NULL DEFAULT 'submitted',
  UNIQUE KEY submissions_assessment_student (assessment_id, student_id),
  KEY submissions_student_idx (student_id),
  CONSTRAINT submissions_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
  CONSTRAINT submissions_student    FOREIGN KEY (student_id)    REFERENCES students (id)    ON DELETE CASCADE,
  CONSTRAINT submissions_file       FOREIGN KEY (file_id)       REFERENCES files (id)       ON DELETE SET NULL,
  CONSTRAINT submissions_grader     FOREIGN KEY (graded_by)     REFERENCES users (id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE submission_answers (
  submission_id BIGINT UNSIGNED NOT NULL,
  question_id   BIGINT UNSIGNED NOT NULL,
  answer        TEXT NULL,
  file_id       BIGINT UNSIGNED NULL,     -- 'file' questions
  marks_awarded DECIMAL(6,2) NULL,
  PRIMARY KEY (submission_id, question_id),
  CONSTRAINT sa_submission FOREIGN KEY (submission_id) REFERENCES submissions (id)          ON DELETE CASCADE,
  CONSTRAINT sa_question   FOREIGN KEY (question_id)   REFERENCES assessment_questions (id) ON DELETE CASCADE,
  CONSTRAINT sa_file       FOREIGN KEY (file_id)       REFERENCES files (id)                ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Live classroom, recordings, flip charts (spec sections 31–34)
-- -----------------------------------------------------------------------------

-- The subject teacher is always the host: nobody else is ever made host, and
-- the class ends by itself at its planned end (scheduled_at + duration +
-- breaks), even if the teacher's connection dropped (spec section 33.1).
CREATE TABLE live_sessions (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id           BIGINT UNSIGNED NOT NULL,
  session_id          BIGINT UNSIGNED NOT NULL,
  course_id           BIGINT UNSIGNED NOT NULL,
  subject_id          BIGINT UNSIGNED NOT NULL,
  class_id            BIGINT UNSIGNED NOT NULL,
  teacher_id          BIGINT UNSIGNED NOT NULL,
  title               VARCHAR(190) NOT NULL,
  description         TEXT NULL,
  scheduled_at        DATETIME NOT NULL,
  duration_minutes    INT UNSIGNED NOT NULL,
  status              ENUM('scheduled','live','ended','cancelled') NOT NULL DEFAULT 'scheduled',
  started_at          DATETIME NULL,
  ended_at            DATETIME NULL,
  waiting_room        BOOLEAN NOT NULL DEFAULT FALSE,
  -- What students may do; the host can change these during class.
  allow_video         BOOLEAN NOT NULL DEFAULT TRUE,
  allow_unmute        BOOLEAN NOT NULL DEFAULT TRUE,
  -- While paused for a break: when, and when the teacher expects to resume.
  paused_at           DATETIME NULL,
  paused_until        DATETIME NULL,
  -- A class continued in several sittings: its part number and the part it continues.
  part                SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  continuation_of     BIGINT UNSIGNED NULL,
  -- Room name at the video provider (LiveKit).
  provider_room       VARCHAR(120) NULL UNIQUE,
  created_at          DATETIME NULL,
  updated_at          DATETIME NULL,
  KEY live_sessions_course_idx (course_id, scheduled_at),
  KEY live_sessions_class_idx (class_id, scheduled_at),
  KEY live_sessions_status_time_idx (status, scheduled_at),
  KEY live_sessions_school_idx (school_id),
  CONSTRAINT live_sessions_school    FOREIGN KEY (school_id)       REFERENCES schools (id),
  CONSTRAINT live_sessions_session   FOREIGN KEY (session_id)      REFERENCES academic_sessions (id),
  CONSTRAINT live_sessions_course    FOREIGN KEY (course_id)       REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT live_sessions_subject   FOREIGN KEY (subject_id)      REFERENCES subjects (id),
  CONSTRAINT live_sessions_class     FOREIGN KEY (class_id)        REFERENCES classes (id),
  CONSTRAINT live_sessions_teacher   FOREIGN KEY (teacher_id)      REFERENCES teachers (id),
  CONSTRAINT live_sessions_continues FOREIGN KEY (continuation_of) REFERENCES live_sessions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Breaks: not counted in class length, recording or attendance minutes.
CREATE TABLE live_session_pauses (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  live_session_id BIGINT UNSIGNED NOT NULL,
  paused_from     DATETIME NOT NULL,
  paused_to       DATETIME NOT NULL,
  KEY live_session_pauses_live_idx (live_session_id),
  CONSTRAINT lsp_live FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE live_session_breakouts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  live_session_id BIGINT UNSIGNED NOT NULL,
  started_at      DATETIME NOT NULL,
  ended_at        DATETIME NOT NULL,
  group_count     SMALLINT UNSIGNED NOT NULL,
  KEY live_session_breakouts_live_idx (live_session_id),
  CONSTRAINT lsb_live FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- People the host removed; they can't rejoin until the host lets them back in.
CREATE TABLE live_session_removals (
  live_session_id BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  removed_at      DATETIME NOT NULL,
  PRIMARY KEY (live_session_id, user_id),
  CONSTRAINT lsr_live FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE CASCADE,
  CONSTRAINT lsr_user FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One recording per class (part). Watch-only unless the school allows downloads.
CREATE TABLE recordings (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        BIGINT UNSIGNED NOT NULL,
  session_id       BIGINT UNSIGNED NOT NULL,
  live_session_id  BIGINT UNSIGNED NOT NULL UNIQUE,
  course_id        BIGINT UNSIGNED NOT NULL,
  class_id         BIGINT UNSIGNED NOT NULL,
  subject_id       BIGINT UNSIGNED NOT NULL,
  teacher_id       BIGINT UNSIGNED NOT NULL,
  title            VARCHAR(190) NOT NULL,
  recorded_on      DATE NOT NULL,
  duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  size_mb          DECIMAL(10,2) NOT NULL DEFAULT 0,
  status           ENUM('processing','ready') NOT NULL DEFAULT 'processing',
  views            INT UNSIGNED NOT NULL DEFAULT 0,
  file_id          BIGINT UNSIGNED NULL,
  created_at       DATETIME NULL,
  updated_at       DATETIME NULL,
  KEY recordings_course_idx (course_id),
  KEY recordings_school_idx (school_id),
  CONSTRAINT recordings_school  FOREIGN KEY (school_id)       REFERENCES schools (id),
  CONSTRAINT recordings_session FOREIGN KEY (session_id)      REFERENCES academic_sessions (id),
  CONSTRAINT recordings_live    FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE CASCADE,
  CONSTRAINT recordings_course  FOREIGN KEY (course_id)       REFERENCES courses (id),
  CONSTRAINT recordings_class   FOREIGN KEY (class_id)        REFERENCES classes (id),
  CONSTRAINT recordings_subject FOREIGN KEY (subject_id)      REFERENCES subjects (id),
  CONSTRAINT recordings_teacher FOREIGN KEY (teacher_id)      REFERENCES teachers (id),
  CONSTRAINT recordings_file    FOREIGN KEY (file_id)         REFERENCES files (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A teacher's saved whiteboard, reopened in another class and carried on.
CREATE TABLE flip_charts (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id              BIGINT UNSIGNED NOT NULL,
  owner_user_id          BIGINT UNSIGNED NOT NULL,
  title                  VARCHAR(190) NOT NULL,
  subject_id             BIGINT UNSIGNED NULL,
  source_live_session_id BIGINT UNSIGNED NULL,
  created_at             DATETIME NULL,
  updated_at             DATETIME NULL,
  KEY flip_charts_owner_idx (owner_user_id),
  CONSTRAINT flip_charts_school  FOREIGN KEY (school_id)              REFERENCES schools (id),
  CONSTRAINT flip_charts_owner   FOREIGN KEY (owner_user_id)          REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT flip_charts_subject FOREIGN KEY (subject_id)             REFERENCES subjects (id) ON DELETE SET NULL,
  CONSTRAINT flip_charts_live    FOREIGN KEY (source_live_session_id) REFERENCES live_sessions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Strokes are the whiteboard's own editable items (pen, shapes, text, maths,
-- graphs) in 0–1 board coordinates, as JSON. A page can sit on a document page
-- or picture (an imported PDF page, a presented slide).
CREATE TABLE flip_chart_pages (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  flip_chart_id      BIGINT UNSIGNED NOT NULL,
  position           INT UNSIGNED NOT NULL,
  strokes            JSON NOT NULL,
  background_file_id BIGINT UNSIGNED NULL,
  background_width   INT UNSIGNED NULL,
  background_height  INT UNSIGNED NULL,
  background_label   VARCHAR(255) NULL,     -- "worksheet.pdf · page 3"
  KEY flip_chart_pages_chart_idx (flip_chart_id, position),
  CONSTRAINT fcp_chart      FOREIGN KEY (flip_chart_id)      REFERENCES flip_charts (id) ON DELETE CASCADE,
  CONSTRAINT fcp_background FOREIGN KEY (background_file_id) REFERENCES files (id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Attendance (spec section 40)
-- -----------------------------------------------------------------------------

-- Physical, live-class or activity attendance. For live classes: first join,
-- last leave, and minutes actually in the room (every stretch, minus breaks);
-- lateness is judged on the first join.
CREATE TABLE attendance_records (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        BIGINT UNSIGNED NOT NULL,
  session_id       BIGINT UNSIGNED NOT NULL,
  class_id         BIGINT UNSIGNED NOT NULL,
  student_id       BIGINT UNSIGNED NOT NULL,
  attended_on      DATE NOT NULL,
  kind             ENUM('physical','live','activity') NOT NULL,
  live_session_id  BIGINT UNSIGNED NULL,
  join_time        DATETIME NULL,
  leave_time       DATETIME NULL,
  duration_minutes INT UNSIGNED NULL,
  status           ENUM('present','late','absent','excused') NOT NULL,
  created_at       DATETIME NULL,
  updated_at       DATETIME NULL,
  UNIQUE KEY attendance_live_student (live_session_id, student_id),
  KEY attendance_class_date_idx (class_id, attended_on),
  KEY attendance_student_idx (student_id, session_id),
  CONSTRAINT attendance_school  FOREIGN KEY (school_id)       REFERENCES schools (id),
  CONSTRAINT attendance_session FOREIGN KEY (session_id)      REFERENCES academic_sessions (id),
  CONSTRAINT attendance_class   FOREIGN KEY (class_id)        REFERENCES classes (id),
  CONSTRAINT attendance_student FOREIGN KEY (student_id)      REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT attendance_live    FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Each stretch a student was in a live class; leaving and rejoining adds a
-- row, and ending the class never overwrites earlier rows.
CREATE TABLE attendance_segments (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attendance_record_id BIGINT UNSIGNED NOT NULL,
  join_time            DATETIME NOT NULL,
  leave_time           DATETIME NOT NULL,
  device_label         VARCHAR(120) NULL,   -- "Chrome on Windows"
  KEY attendance_segments_record_idx (attendance_record_id, join_time),
  CONSTRAINT attendance_segments_record FOREIGN KEY (attendance_record_id) REFERENCES attendance_records (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Communication: notifications, email, messages, forums, calendar (sections 41–42)
-- -----------------------------------------------------------------------------

-- user_id set = to one person; user_id NULL + school_id = to a whole school.
CREATE TABLE notifications (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NULL,
  school_id  BIGINT UNSIGNED NULL,
  kind       ENUM('assignment','quiz','material','live_upcoming','live_starting','graded','announcement','recording','system') NOT NULL,
  title      VARCHAR(190) NOT NULL,
  body       TEXT NOT NULL,
  href       VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  KEY notifications_user_idx (user_id, created_at),
  KEY notifications_school_idx (school_id, created_at),
  CONSTRAINT notifications_user   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
  CONSTRAINT notifications_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_reads (
  notification_id BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  read_at         DATETIME NOT NULL,
  PRIMARY KEY (notification_id, user_id),
  CONSTRAINT nr_notification FOREIGN KEY (notification_id) REFERENCES notifications (id) ON DELETE CASCADE,
  CONSTRAINT nr_user         FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every email the platform sends (the mailer's outbox and history).
CREATE TABLE email_outbox (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NULL,
  school_id  BIGINT UNSIGNED NULL,
  to_address VARCHAR(190) NOT NULL,
  subject    VARCHAR(255) NOT NULL,
  body       MEDIUMTEXT NOT NULL,
  kind       ENUM('assignment','quiz','material','live_upcoming','live_starting','graded','announcement','recording','system') NOT NULL,
  href       VARCHAR(500) NULL,
  status     ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  queued_at  DATETIME NOT NULL,
  sent_at    DATETIME NULL,
  KEY email_outbox_status_idx (status, queued_at),
  KEY email_outbox_user_idx (user_id),
  CONSTRAINT email_outbox_user   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE SET NULL,
  CONSTRAINT email_outbox_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every SMS the platform sends: the SMS provider's outbox and delivery history.
-- Today: guardian alerts for Vacation Classes (spec section 49.1.8) — one per
-- student, live class and kind, which the unique key enforces.
CREATE TABLE sms_outbox (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       BIGINT UNSIGNED NOT NULL,
  student_id      BIGINT UNSIGNED NULL,
  live_session_id BIGINT UNSIGNED NULL,
  kind            ENUM('live_absent','live_left_early') NOT NULL,
  to_phone        VARCHAR(20)  NOT NULL,
  body            VARCHAR(480) NOT NULL,
  status          ENUM('queued','sent','delivered','failed') NOT NULL DEFAULT 'queued',
  provider_ref    VARCHAR(120) NULL,
  queued_at       DATETIME NOT NULL,
  sent_at         DATETIME NULL,
  UNIQUE KEY uq_sms_outbox_alert (live_session_id, student_id, kind),
  KEY sms_outbox_school_idx (school_id, queued_at),
  CONSTRAINT sms_outbox_school  FOREIGN KEY (school_id)       REFERENCES schools (id),
  CONSTRAINT sms_outbox_student FOREIGN KEY (student_id)      REFERENCES students (id)      ON DELETE SET NULL,
  CONSTRAINT sms_outbox_live    FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Direct messages (spec section 41.2). Participants always share a school.
CREATE TABLE conversations (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id       BIGINT UNSIGNED NULL,
  subject         VARCHAR(190) NULL,
  created_at      DATETIME NOT NULL,
  last_message_at DATETIME NOT NULL,
  KEY conversations_school_idx (school_id),
  CONSTRAINT conversations_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_participants (
  conversation_id BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (conversation_id, user_id),
  KEY conversation_participants_user_idx (user_id),
  CONSTRAINT cp_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT cp_user         FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id       BIGINT UNSIGNED NOT NULL,
  body            TEXT NOT NULL,
  sent_at         DATETIME NOT NULL,
  KEY messages_conversation_idx (conversation_id, sent_at),
  CONSTRAINT messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT messages_sender       FOREIGN KEY (sender_id)       REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message_reads (
  message_id BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  read_at    DATETIME NOT NULL,
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT mr_message FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
  CONSTRAINT mr_user    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One forum per course (subject × class × session); access = teaching or
-- being enrolled in the course (spec section 41.3).
CREATE TABLE forum_threads (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id        BIGINT UNSIGNED NOT NULL,
  session_id       BIGINT UNSIGNED NOT NULL,
  course_id        BIGINT UNSIGNED NOT NULL,
  author_id        BIGINT UNSIGNED NOT NULL,
  title            VARCHAR(190) NOT NULL,
  body             TEXT NOT NULL,
  pinned           BOOLEAN NOT NULL DEFAULT FALSE,
  locked           BOOLEAN NOT NULL DEFAULT FALSE,
  is_question      BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_post_id BIGINT UNSIGNED NULL,
  created_at       DATETIME NOT NULL,
  last_activity_at DATETIME NOT NULL,
  KEY forum_threads_course_idx (course_id, pinned, last_activity_at),
  CONSTRAINT forum_threads_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT forum_threads_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id),
  CONSTRAINT forum_threads_course  FOREIGN KEY (course_id)  REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT forum_threads_author  FOREIGN KEY (author_id)  REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE forum_posts (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id  BIGINT UNSIGNED NOT NULL,
  author_id  BIGINT UNSIGNED NOT NULL,
  body       TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  KEY forum_posts_thread_idx (thread_id, created_at),
  CONSTRAINT forum_posts_thread FOREIGN KEY (thread_id) REFERENCES forum_threads (id) ON DELETE CASCADE,
  CONSTRAINT forum_posts_author FOREIGN KEY (author_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE forum_thread_reads (
  thread_id BIGINT UNSIGNED NOT NULL,
  user_id   BIGINT UNSIGNED NOT NULL,
  read_at   DATETIME NOT NULL,
  PRIMARY KEY (thread_id, user_id),
  CONSTRAINT ftr_thread FOREIGN KEY (thread_id) REFERENCES forum_threads (id) ON DELETE CASCADE,
  CONSTRAINT ftr_user   FOREIGN KEY (user_id)   REFERENCES users (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- course_id NULL = a school-wide announcement.
CREATE TABLE announcements (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  BIGINT UNSIGNED NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  course_id  BIGINT UNSIGNED NULL,
  author_id  BIGINT UNSIGNED NOT NULL,
  title      VARCHAR(190) NOT NULL,
  body       TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  KEY announcements_school_idx (school_id, session_id, created_at),
  KEY announcements_course_idx (course_id),
  CONSTRAINT announcements_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT announcements_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id),
  CONSTRAINT announcements_course  FOREIGN KEY (course_id)  REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT announcements_author  FOREIGN KEY (author_id)  REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- School calendar (spec section 42): events, holidays, exams.
CREATE TABLE school_events (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id  BIGINT UNSIGNED NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  title      VARCHAR(190) NOT NULL,
  event_date DATE NOT NULL,
  kind       ENUM('event','holiday','exam') NOT NULL,
  created_at DATETIME NULL,
  KEY school_events_school_date_idx (school_id, event_date),
  CONSTRAINT school_events_school  FOREIGN KEY (school_id)  REFERENCES schools (id),
  CONSTRAINT school_events_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Vacation Classes: pricing, bundles, registration, payment (spec section 49.1)
-- -----------------------------------------------------------------------------

-- Fee for one subject in a vacation batch, and the levels it's offered to.
CREATE TABLE vacation_prices (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  fee_minor  BIGINT UNSIGNED NOT NULL,   -- in minor units of currency (pesewas for GHS)
  currency   CHAR(3) NOT NULL,
  UNIQUE KEY vacation_prices_session_subject (session_id, subject_id),
  CONSTRAINT vacation_prices_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id),
  CONSTRAINT vacation_prices_subject FOREIGN KEY (subject_id) REFERENCES subjects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vacation_price_classes (
  vacation_price_id BIGINT UNSIGNED NOT NULL,
  class_id          BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (vacation_price_id, class_id),
  CONSTRAINT vpc_price FOREIGN KEY (vacation_price_id) REFERENCES vacation_prices (id) ON DELETE CASCADE,
  CONSTRAINT vpc_class FOREIGN KEY (class_id)          REFERENCES classes (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subjects sold together for one fee. No class rows = open to any level.
CREATE TABLE vacation_bundles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price_minor BIGINT UNSIGNED NOT NULL,  -- in minor units of currency
  currency    CHAR(3) NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  featured    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NULL,
  updated_at  DATETIME NULL,
  KEY vacation_bundles_session_idx (session_id, active),
  CONSTRAINT vacation_bundles_session FOREIGN KEY (session_id) REFERENCES academic_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vacation_bundle_classes (
  bundle_id BIGINT UNSIGNED NOT NULL,
  class_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (bundle_id, class_id),
  CONSTRAINT vbc_bundle FOREIGN KEY (bundle_id) REFERENCES vacation_bundles (id) ON DELETE CASCADE,
  CONSTRAINT vbc_class  FOREIGN KEY (class_id)  REFERENCES classes (id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vacation_bundle_subjects (
  bundle_id  BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (bundle_id, subject_id),
  CONSTRAINT vbs_bundle  FOREIGN KEY (bundle_id)  REFERENCES vacation_bundles (id) ON DELETE CASCADE,
  CONSTRAINT vbs_subject FOREIGN KEY (subject_id) REFERENCES subjects (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vacation_registrations (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id       BIGINT UNSIGNED NOT NULL,
  user_id          BIGINT UNSIGNED NOT NULL,
  -- The student record inside the vacation workspace.
  student_id       BIGINT UNSIGNED NOT NULL,
  class_id         BIGINT UNSIGNED NOT NULL,
  bundle_id        BIGINT UNSIGNED NULL,
  amount_minor     BIGINT UNSIGNED NOT NULL,   -- in minor units of currency
  currency         CHAR(3) NOT NULL,
  status           ENUM('awaiting_payment','paid','cancelled','refunded') NOT NULL DEFAULT 'awaiting_payment',
  -- 'existing' = already had an account; 'new' = registered here.
  source           ENUM('existing','new') NOT NULL,
  -- The student's current school: picked from the list (home_school_id), or
  -- typed when it isn't listed (home_school_name), plus its level.
  home_school_id   BIGINT UNSIGNED NULL,
  home_school_name VARCHAR(190) NULL,
  home_school_type ENUM('SHS','JHS','Primary','TVET','College','University') NULL,
  created_at       DATETIME NOT NULL,
  updated_at       DATETIME NULL,
  UNIQUE KEY vacation_registrations_student (session_id, student_id),
  KEY vacation_registrations_status_idx (session_id, status),
  CONSTRAINT vr_session FOREIGN KEY (session_id)     REFERENCES academic_sessions (id),
  CONSTRAINT vr_user    FOREIGN KEY (user_id)        REFERENCES users (id),
  CONSTRAINT vr_student FOREIGN KEY (student_id)     REFERENCES students (id),
  CONSTRAINT vr_class   FOREIGN KEY (class_id)       REFERENCES classes (id),
  CONSTRAINT vr_bundle  FOREIGN KEY (bundle_id)      REFERENCES vacation_bundles (id) ON DELETE SET NULL,
  CONSTRAINT vr_home    FOREIGN KEY (home_school_id) REFERENCES schools (id)          ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vacation_registration_subjects (
  registration_id BIGINT UNSIGNED NOT NULL,
  subject_id      BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (registration_id, subject_id),
  CONSTRAINT vrs_registration FOREIGN KEY (registration_id) REFERENCES vacation_registrations (id) ON DELETE CASCADE,
  CONSTRAINT vrs_subject      FOREIGN KEY (subject_id)      REFERENCES subjects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mobile money or card payments. A registration can have failed attempts
-- before the one that succeeds.
CREATE TABLE payments (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  registration_id BIGINT UNSIGNED NOT NULL,
  method          ENUM('momo_mtn','momo_telecel','momo_airteltigo','card','cash') NOT NULL,
  amount_minor    BIGINT UNSIGNED NOT NULL,   -- in minor units of currency
  currency        CHAR(3) NOT NULL,
  reference       VARCHAR(80) NOT NULL UNIQUE,
  status          ENUM('pending','succeeded','failed','refunded') NOT NULL DEFAULT 'pending',
  phone           VARCHAR(20) NULL,         -- mobile money number
  card_last4      CHAR(4) NULL,
  paid_at         DATETIME NULL,
  created_at      DATETIME NOT NULL,
  KEY payments_registration_idx (registration_id),
  CONSTRAINT payments_registration FOREIGN KEY (registration_id) REFERENCES vacation_registrations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. Audit log (spec section 50)
-- -----------------------------------------------------------------------------

-- actor_name is kept as written, so the log still reads correctly after the
-- user is renamed or removed.
CREATE TABLE audit_logs (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  at         DATETIME NOT NULL,
  actor_id   BIGINT UNSIGNED NULL,
  actor_name VARCHAR(190) NOT NULL,
  school_id  BIGINT UNSIGNED NULL,
  category   ENUM('school','user','academic','rbac','lms','assessment','live','system') NOT NULL,
  action     VARCHAR(190) NOT NULL,
  target     VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  KEY audit_logs_school_at_idx (school_id, at),
  KEY audit_logs_category_at_idx (category, at),
  CONSTRAINT audit_logs_actor  FOREIGN KEY (actor_id)  REFERENCES users (id)   ON DELETE SET NULL,
  CONSTRAINT audit_logs_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. Links that point "forward" to tables created later
-- -----------------------------------------------------------------------------

ALTER TABLE content_items
  ADD CONSTRAINT content_items_assessment FOREIGN KEY (assessment_id)   REFERENCES assessments (id)   ON DELETE SET NULL,
  ADD CONSTRAINT content_items_live       FOREIGN KEY (live_session_id) REFERENCES live_sessions (id) ON DELETE SET NULL,
  ADD CONSTRAINT content_items_recording  FOREIGN KEY (recording_id)    REFERENCES recordings (id)    ON DELETE SET NULL,
  ADD CONSTRAINT content_items_video      FOREIGN KEY (video_id)        REFERENCES video_assets (id)  ON DELETE SET NULL;

ALTER TABLE forum_threads
  ADD CONSTRAINT forum_threads_accepted FOREIGN KEY (accepted_post_id) REFERENCES forum_posts (id) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 15. Reference data every install needs
-- -----------------------------------------------------------------------------

INSERT INTO platform_settings (id, platform_name, support_email) VALUES (1, 'ClassRoom LMS Project', 'support@classroomlms.example');

-- Ghana, the first country, and its two kinds of school code (spec section 10.1).
INSERT INTO countries (id, code, name, currency, default_locale, default_timezone, region_label, district_label) VALUES
  (1, 'GH', 'Ghana', 'GHS', 'en', 'Africa/Accra', 'Region', 'District');
INSERT INTO school_identifier_schemes (country_id, code, name, pattern, sign_in, prefixes_usernames) VALUES
  (1, 'waec',     'WAEC code',     '^[0-9]{7}$', TRUE, TRUE),
  (1, 'ges_emis', 'GES EMIS code', NULL,         TRUE, FALSE);

INSERT INTO roles (`key`, name, description, is_system, scope) VALUES
  ('super_admin',  'Super Administrator',  'Runs the platform: schools, catalogue, national analytics.', TRUE, 'platform'),
  ('school_admin', 'School Administrator', 'Runs one school. Signs in with the school''s WAEC or GES EMIS code.', TRUE, 'school'),
  ('teacher',      'Teacher',              'Teaches courses and runs live classes.', TRUE, 'school'),
  ('student',      'Student',              'Learns, joins live classes, submits work.', TRUE, 'school'),
  ('guardian',     'Parent / Guardian',    'Follows their children''s progress, grades, work and attendance where the school has parent access. Scoped by guardian_links, not permissions.', TRUE, 'school');

-- Permission catalogue, generated from lib/permissions.ts (PERMISSION_GROUPS).
INSERT INTO permissions (`key`, group_key, label) VALUES
  ('schools.view', 'schools', 'View schools'),
  ('schools.create', 'schools', 'Create schools'),
  ('schools.update', 'schools', 'Edit schools'),
  ('schools.delete', 'schools', 'Delete schools'),
  ('schools.suspend', 'schools', 'Suspend schools'),
  ('users.view', 'users', 'View users'),
  ('users.create', 'users', 'Create users'),
  ('users.update', 'users', 'Edit users'),
  ('users.delete', 'users', 'Delete users'),
  ('users.import', 'users', 'Import users'),
  ('students.view', 'students', 'View students'),
  ('students.create', 'students', 'Create students'),
  ('students.update', 'students', 'Edit students'),
  ('students.delete', 'students', 'Delete students'),
  ('students.import', 'students', 'Import students'),
  ('students.export', 'students', 'Export students'),
  ('guardians.view', 'guardians', 'View parents and guardians'),
  ('guardians.manage', 'guardians', 'Add and remove parent accounts'),
  ('teachers.view', 'teachers', 'View teachers'),
  ('teachers.create', 'teachers', 'Create teachers'),
  ('teachers.update', 'teachers', 'Edit teachers'),
  ('teachers.delete', 'teachers', 'Delete teachers'),
  ('academic_sessions.view', 'academic_sessions', 'View sessions'),
  ('academic_sessions.create', 'academic_sessions', 'Create sessions'),
  ('academic_sessions.update', 'academic_sessions', 'Edit sessions'),
  ('academic_sessions.activate', 'academic_sessions', 'Activate sessions'),
  ('programmes.view', 'programmes', 'View programmes'),
  ('programmes.create', 'programmes', 'Create programmes'),
  ('programmes.update', 'programmes', 'Edit programmes'),
  ('programmes.delete', 'programmes', 'Delete programmes'),
  ('classes.view', 'classes', 'View classes'),
  ('classes.create', 'classes', 'Create classes'),
  ('classes.update', 'classes', 'Edit classes'),
  ('classes.delete', 'classes', 'Delete classes'),
  ('subjects.view', 'subjects', 'View subjects'),
  ('subjects.create', 'subjects', 'Create subjects'),
  ('subjects.update', 'subjects', 'Edit subjects'),
  ('subjects.delete', 'subjects', 'Delete subjects'),
  ('subjects.assign', 'subjects', 'Assign teachers & students'),
  ('courses.view', 'courses', 'View courses'),
  ('courses.create', 'courses', 'Create courses'),
  ('courses.update', 'courses', 'Edit courses'),
  ('courses.delete', 'courses', 'Delete courses'),
  ('modules.create', 'modules', 'Create modules'),
  ('modules.update', 'modules', 'Edit modules'),
  ('modules.delete', 'modules', 'Delete modules'),
  ('content.create', 'content', 'Create content'),
  ('content.update', 'content', 'Edit content'),
  ('content.delete', 'content', 'Delete content'),
  ('content.publish', 'content', 'Publish content'),
  ('library.manage', 'library', 'Manage the shared learning materials library'),
  ('scorm.upload', 'scorm', 'Add SCORM packages to courses'),
  ('scorm.export', 'scorm', 'Export courses as SCORM packages'),
  ('live_classes.view', 'live_classes', 'View live classes'),
  ('live_classes.create', 'live_classes', 'Create live classes'),
  ('live_classes.schedule', 'live_classes', 'Schedule live classes'),
  ('live_classes.start', 'live_classes', 'Start live classes'),
  ('live_classes.end', 'live_classes', 'End live classes'),
  ('live_classes.recordings', 'live_classes', 'Access recordings'),
  ('live_classes.download_recordings', 'live_classes', 'Download class recordings'),
  ('assessments.view', 'assessments', 'View assessments'),
  ('assessments.create', 'assessments', 'Create assessments'),
  ('assessments.update', 'assessments', 'Edit assessments'),
  ('assessments.delete', 'assessments', 'Delete assessments'),
  ('assessments.grade', 'assessments', 'Grade students'),
  ('assessments.export', 'assessments', 'Export grades'),
  ('analytics.school', 'analytics', 'School analytics'),
  ('analytics.district', 'analytics', 'District analytics'),
  ('analytics.region', 'analytics', 'Regional analytics'),
  ('analytics.national', 'analytics', 'National analytics'),
  ('analytics.global', 'analytics', 'Global analytics (all countries)');

-- Each built-in role's default permissions (lib/permissions.ts DEFAULT_ROLE_PERMISSIONS).
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r JOIN permissions p ON p.`key` IN ('schools.view', 'schools.create', 'schools.update', 'schools.delete', 'schools.suspend', 'users.view', 'users.create', 'users.update', 'users.delete', 'users.import', 'students.view', 'students.create', 'students.update', 'students.delete', 'students.import', 'students.export', 'guardians.view', 'guardians.manage', 'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete', 'academic_sessions.view', 'academic_sessions.create', 'academic_sessions.update', 'academic_sessions.activate', 'programmes.view', 'programmes.create', 'programmes.update', 'programmes.delete', 'classes.view', 'classes.create', 'classes.update', 'classes.delete', 'subjects.view', 'subjects.create', 'subjects.update', 'subjects.delete', 'subjects.assign', 'courses.view', 'courses.create', 'courses.update', 'courses.delete', 'modules.create', 'modules.update', 'modules.delete', 'content.create', 'content.update', 'content.delete', 'content.publish', 'library.manage', 'scorm.upload', 'scorm.export', 'live_classes.view', 'live_classes.create', 'live_classes.schedule', 'live_classes.start', 'live_classes.end', 'live_classes.recordings', 'live_classes.download_recordings', 'assessments.view', 'assessments.create', 'assessments.update', 'assessments.delete', 'assessments.grade', 'assessments.export', 'analytics.school', 'analytics.district', 'analytics.region', 'analytics.national', 'analytics.global')
  WHERE r.`key` = 'super_admin';
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r JOIN permissions p ON p.`key` IN ('students.view', 'students.create', 'students.update', 'students.delete', 'students.import', 'students.export', 'guardians.view', 'guardians.manage', 'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete', 'academic_sessions.view', 'academic_sessions.create', 'academic_sessions.update', 'academic_sessions.activate', 'programmes.view', 'programmes.create', 'programmes.update', 'programmes.delete', 'classes.view', 'classes.create', 'classes.update', 'classes.delete', 'subjects.view', 'subjects.create', 'subjects.update', 'subjects.delete', 'subjects.assign', 'courses.view', 'courses.create', 'courses.update', 'courses.delete', 'modules.create', 'modules.update', 'modules.delete', 'content.create', 'content.update', 'content.delete', 'content.publish', 'live_classes.view', 'live_classes.create', 'live_classes.schedule', 'live_classes.start', 'live_classes.end', 'live_classes.recordings', 'live_classes.download_recordings', 'assessments.view', 'assessments.create', 'assessments.update', 'assessments.delete', 'assessments.grade', 'assessments.export', 'users.view', 'users.create', 'users.update', 'users.import', 'analytics.school')
  WHERE r.`key` = 'school_admin';
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r JOIN permissions p ON p.`key` IN ('students.view', 'classes.view', 'subjects.view', 'courses.view', 'courses.update', 'modules.create', 'modules.update', 'modules.delete', 'content.create', 'content.update', 'content.delete', 'content.publish', 'live_classes.view', 'live_classes.create', 'live_classes.schedule', 'live_classes.start', 'live_classes.end', 'live_classes.recordings', 'assessments.view', 'assessments.create', 'assessments.update', 'assessments.delete', 'assessments.grade', 'assessments.export')
  WHERE r.`key` = 'teacher';
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r JOIN permissions p ON p.`key` IN ('courses.view', 'subjects.view', 'classes.view', 'live_classes.view', 'live_classes.recordings', 'assessments.view')
  WHERE r.`key` = 'student';
