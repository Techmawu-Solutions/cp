# ClassProject Project Map

Mermaid diagrams of the ClassProject LMS and virtual classroom prototype, generated from the product specification and codebase (28 Sep 2026). Open `docs/project-map.html` in a browser for the interactive version: click a box for what it is and where it lives in the code, zoom, drag and search.

## System overview

The people, the four portals and shared areas, the data layer, and the services the prototype simulates today.

```mermaid
flowchart TB
  subgraph People["People"]
    SA["Super Administrator"]
    SCHA["School Administrator"]
    TCH["Teacher"]
    STU["Student"]
    VCO["Vacation coordinator"]
  end
  subgraph App["ClassProject web app"]
    LOGIN["Sign in"]
    SHELL["App shell: sidebar, workspace, active session, bells"]
    PSA["Super Admin portal"]
    PSCH["School portal"]
    PTCH["Teacher portal"]
    PSTU["Student portal"]
    SHARED["Forums, messages, calendar, notifications"]
    LIVE["Live classroom"]
    LEARN["Learning area + SCORM player"]
    VSITE["Vacation Classes site"]
  end
  subgraph Data["Data layer"]
    STORE["Store in IndexedDB"]
    SEED["Seeded demo data"]
    ACTIONS["Actions: future API calls"]
    RBAC["Roles and permissions"]
  end
  subgraph Prod["Production services, simulated today"]
    API["Laravel API + MySQL"]
    LK["LiveKit video + data"]
    S3["Object storage"]
    PAY["Mobile Money and card"]
    MSG["Email and SMS"]
  end
  SA --> LOGIN
  SCHA --> LOGIN
  TCH --> LOGIN
  STU --> LOGIN
  VCO --> LOGIN
  STU -.-> VSITE
  LOGIN --> SHELL
  SHELL --> PSA
  SHELL --> PSCH
  SHELL --> PTCH
  SHELL --> PSTU
  SHELL --> SHARED
  PTCH --> LIVE
  PSTU --> LIVE
  PSTU --> LEARN
  PSA --> STORE
  PSCH --> ACTIONS
  PTCH --> ACTIONS
  PSTU --> ACTIONS
  ACTIONS --> STORE
  SEED --> STORE
  RBAC --> SHELL
  STORE -.->|"later"| API
  LIVE -.->|"later"| LK
  LEARN -.->|"later"| S3
  VSITE -.->|"later"| PAY
  SHARED -.->|"later"| MSG
```

Click any box for details. Drag to move, use the buttons to zoom.

## Sign-in and roles

One field takes an email, username, staff ID or school code. Every user has exactly one role, which decides their portal.

```mermaid
flowchart TD
  IN["Email, username, staff ID or school code + password"] --> KIND{"What was typed?"}
  KIND -->|"WAEC or GES EMIS code"| ADMINS["Administrators of that school"]
  KIND -->|"Email or platform username"| ONE["That user"]
  KIND -->|"School username WAEC-NNNN-YY"| PUPIL["That student"]
  KIND -->|"Staff ID"| STAFF["That teacher"]
  ONE --> GUARD{"School admin whose school has a code?"}
  GUARD -->|"yes"| REFUSE["Refused: use the school code"]
  GUARD -->|"no"| PWD{"Password matches?"}
  ADMINS --> PWD
  PUPIL --> PWD
  STAFF --> PWD
  PWD -->|"no"| WRONG["Incorrect password"]
  PWD -->|"yes"| SCHOOLOK{"School active?"}
  SCHOOLOK -->|"suspended or archived"| BLOCKED["Blocked"]
  SCHOOLOK -->|"yes"| ROLE["The user's one role"]
  ROLE --> RSA["Super Admin portal"]
  ROLE --> RSCH["School portal"]
  ROLE --> RTCH["Teacher portal"]
  ROLE --> RSTU["Student portal"]
```

Staff IDs used at two schools ask the teacher to use their email or platform username instead.

## Data model

Every tenant record carries its school, and every academic record its session, so schools and years never mix.

```mermaid
erDiagram
  SCHOOL {
    string waecCode
    string emisCode
    string category
    string ownership
    string kind
  }
  USER {
    string username
    string email
    string roleId
  }
  STUDENT {
    string studentNumber
    string schoolUsername
    string indexNumber
  }
  TEACHER {
    string staffNumber
  }
  SCHOOL ||--o{ ACADEMIC_YEAR : has
  ACADEMIC_YEAR ||--o{ SESSION : "semesters or terms"
  SCHOOL ||--o{ USER : "home school"
  USER ||--o| STUDENT : "student record"
  USER ||--o| TEACHER : "teacher record"
  SESSION ||--o{ CLASS : has
  SESSION ||--o{ SUBJECT : offers
  CLASS ||--o{ PLACEMENT : holds
  STUDENT ||--o{ PLACEMENT : "placed in"
  STUDENT ||--o{ ENROLLMENT : takes
  SUBJECT ||--o{ ENROLLMENT : "taken by"
  COURSE }o--|| CLASS : for
  COURSE }o--|| SUBJECT : teaches
  COURSE }o--|| TEACHER : "taught by"
  COURSE ||--o{ MODULE : sections
  MODULE ||--o{ CONTENT : items
  COURSE ||--o{ ASSESSMENT : has
  ASSESSMENT ||--o{ SUBMISSION : receives
  STUDENT ||--o{ SUBMISSION : makes
  COURSE ||--o{ LIVE_SESSION : schedules
  LIVE_SESSION ||--o| RECORDING : produces
  LIVE_SESSION ||--o{ ATTENDANCE : records
  CONTENT ||--o{ SCORM_ATTEMPT : tracks
  STUDENT ||--o{ SCORM_ATTEMPT : makes
  CONTENT |o--o| ASSESSMENT : "SCORM grade item"
  USER ||--o{ VACATION_REGISTRATION : registers
```

Types live in `lib/types.ts`; the seeded database shape is `DB` in `lib/data/seed.ts`.

## Academic structure

From a school's profile down to a single lesson. The sidebar shows the active session; sessions are set and viewed on the Academic Sessions page.

```mermaid
flowchart LR
  SCHOOL["School: WAEC code, GES EMIS code, Basic / JHS / SHS, public or private"] --> YEAR["Academic year 2026/2027"]
  YEAR --> SEM["Semesters or terms; one active"]
  CAT["Platform catalogue"] --> PROG["Programmes offered"]
  CAT --> SUBJ["Subjects offered"]
  REQ["Request a missing item"] -.-> CAT
  SEM --> CLASSES["Classes e.g. SHS 1A"]
  PROG --> CLASSES
  SUBJ --> ASSIGN["Teacher assigned to subject and classes"]
  CLASSES --> ASSIGN
  ASSIGN --> COURSE["Course = subject x class x teacher"]
  STUDENTS["Students placed in a class"] --> ENROL["Enrolled in subjects"]
  CLASSES --> STUDENTS
  ENROL --> COURSE
  COURSE --> SECTIONS["Sections: draft, published or scheduled"]
  SECTIONS --> ITEMS["Items: lessons, video, PDF, links, SCORM"]
  COURSE --> ASSESS["Assessments and gradebook"]
  COURSE --> LIVEC["Live classes and recordings"]
  COURSE --> FORUM["Class and subject forum"]
```

Programmes and subjects come from the platform catalogue; schools request anything missing and are notified when it's added.

## School onboarding and usernames

Schools can be added one at a time or uploaded in bulk; missing details are collected from the school administrator before setup continues.

```mermaid
flowchart TD
  ADD["Super Admin adds a school"] --> NEW["New school wizard"]
  ADD --> BULK["Bulk upload CSV or Excel, per category and type"]
  NEW --> ACTIVE["School active + administrator invited"]
  BULK --> MISSING{"WAEC, GES EMIS, region or district missing?"}
  MISSING -->|"no"| ACTIVE
  MISSING -->|"yes"| GATE["Admin signs in by email and must complete the profile"]
  GATE --> CODE["WAEC or GES EMIS code saved"]
  CODE --> ADMINSIGN["Admins now sign in with the school code"]
  CODE --> GEN["Generate student usernames"]
  ACTIVE --> SETUP["Setup guide: sessions, programmes, classes, subjects, people"]
  SETUP --> IMPORT["Import students and teachers"]
  IMPORT --> UNAME{"School has a WAEC code?"}
  UNAME -->|"yes"| SUN["School username WAECCODE-NNNN-YY = Student ID"]
  UNAME -->|"no"| PLAT["Platform username only, e.g. cp1000417"]
  GEN --> SUN
```

Every user also has a permanent platform username that other TechMawu products integrate against.

## Live class lifecycle

The status in class lists follows the clock, so a due class can always be started from the list.

```mermaid
stateDiagram-v2
  state "Scheduled" as Scheduled
  state "Due now" as Due
  state "Live" as Live
  state "Paused for a break" as Paused
  state "Ended" as Ended
  state "Not held" as NotHeld
  state "Recording ready" as Recording
  state "Part 2 scheduled" as Part2
  [*] --> Scheduled: Teacher schedules with start and end time
  Scheduled --> Due: 15 minutes before the start
  Due --> Live: Teacher presses Start class in the lobby
  Due --> NotHeld: Planned end passes
  Live --> Paused: Pause
  Paused --> Live: Resume
  Live --> Ended: End class
  Live --> Part2: End and continue later
  Ended --> Recording: Recording processed and added to the course
  Recording --> [*]
  NotHeld --> [*]
  Part2 --> Scheduled
```

Students are notified when a class is scheduled and again when it starts.

## Classroom stage sync

The teacher owns the main stage. Students receive only what they are allowed to see.

```mermaid
sequenceDiagram
  participant T as Teacher
  participant C as Class channel
  participant S as Students
  T->>C: Stage: video, whiteboard, presentation or screen
  C->>S: Only the page students may see
  T->>C: Pen strokes while drawing
  C->>S: Strokes appear live
  T->>C: Laser pointer position, never stored
  C->>S: Red dot on the same spot of the same page
  Note over S: Each person zooms their own view
  T->>C: Who can draw: only me, everyone or one student
  S->>C: Allowed student's strokes
  C->>T: Student's answer on the board
  T->>C: Pause, breakout rooms, end class
  C->>S: Stage follows
  Note over T,S: Prototype relays between browser tabs, production uses LiveKit data and video tracks
```

Code: `components/classroom/stage-sync.ts`, `whiteboard.tsx`, `app/classroom/[id]/page.tsx`.

## Presenting

Whatever is presented opens on the board, so pen, highlighter, laser and zoom work on it.

```mermaid
flowchart LR
  PBTN["Present"] --> PICK{"Choose"}
  PICK --> PL["A course lesson"]
  PICK --> PD["A course PDF or picture"]
  PICK --> PF["A file: PDF, JPG, PNG, GIF, WebP"]
  PICK --> PSS["Share screen instead"]
  OFFICE["PowerPoint, Word, Excel"] -.->|"save as PDF"| PF
  PL --> RENDER["Lesson drawn onto 16:9 pages"]
  PD --> PAGES["Choose pages, whole or halves"]
  PF --> PAGES
  RENDER --> BOARD["Pages on the board, shown live"]
  PAGES --> BOARD
  BOARD --> PEN["Pen, highlighter, shapes, text, equations"]
  BOARD --> LASER["Laser pointer for the class"]
  BOARD --> ZOOM["Zoom and move, per person"]
  BOARD --> FLIP["Save as a flip chart or add to the course"]
```

Screen sharing carries the shared tab's or screen's sound where the browser allows it.

## SCORM import, play and export

SCORM 1.2 and 2004 packages play in-app with the full run-time API; any course can leave the platform as a SCORM package.

```mermaid
flowchart LR
  ZIP["SCORM .zip upload"] --> MANI["Read imsmanifest.xml"]
  MANI --> UNPACK["Unpack for the in-app player"]
  UNPACK --> PLAYER["SCORM player"]
  PLAYER --> RTE["Run-time API: API and API_1484_11"]
  RTE --> CMI["CMI data: status, score, time, bookmark, suspend data"]
  CMI --> ATT["Learner attempts"]
  ATT --> DONE["Course progress"]
  ATT --> RES["Teacher's learner results"]
  ATT --> GB["Gradebook, best score"]
  PLAYER --> NAV["2004 navigation between lessons"]
  COURSE["A course"] --> EXP["Export SCORM, Super Admin only"]
  EXP --> PKG["SCORM 1.2 or 2004 package"]
  QUIZ["Quizzes and assessments"] --> QSCO["Self-marking quiz lessons with interactions"]
  QSCO --> PKG
  PKG -.->|"round trip"| ZIP
```

Code: `lib/scorm/*`, `components/course/scorm-*.tsx`, `public/scorm-content/sw.js`.

## Vacation Classes

A separate paid workspace with every LMS feature, open to students from any school or none.

```mermaid
flowchart TD
  LAND["Public landing page /vacation"] --> LEVEL["Choose level: JHS 3, SHS 1 to 3"]
  LEVEL --> CHOICE{"Bundle or subjects?"}
  CHOICE --> BUNDLE["A bundle at a set price"]
  CHOICE --> PICKS["Individual subjects"]
  BUNDLE --> ACCOUNT{"Account"}
  PICKS --> ACCOUNT
  ACCOUNT -->|"I already have an account"| EXIST["Sign in; details picked up"]
  ACCOUNT -->|"I'm new here"| NEWACC["Create account: school level, school or contact support"]
  EXIST --> PAYSTEP["Pay: Mobile Money or card"]
  NEWACC --> PAYSTEP
  PAYSTEP --> ENROLLED["Enrolled in the vacation workspace"]
  ENROLLED --> MATCH["Coordinator matches vacation teachers"]
  ENROLLED --> SWITCH["Workspace switcher: school and Vacation Classes"]
```

Registrations stay "awaiting payment" until paid; only paid students are enrolled.

## Portal navigation

What each role finds in the sidebar. Access is by permission, never by role name.

```mermaid
mindmap
  root((ClassProject))
    Super Admin
      Schools and bulk import
      Users, roles, permissions
      Academic catalogue and requests
      Content and SCORM export
      Live classes and reports
      National, regional, district analytics
      Vacation Classes
      Audit logs and settings
    School Admin
      Academic Sessions
      Programmes, classes, subjects
      Students, teachers, enrolments
      Courses and assessments
      Grades and attendance
      Live classes
      Vacation tools
    Teacher
      My classes and subjects
      Content builder
      Assessments and gradebook
      Live classes and flip charts
      Academic Sessions
    Student
      Dashboard and courses
      Assignments and quizzes
      Grades
      Live classes and recordings
      Academic Sessions
    Everyone
      Forums
      Messages
      Calendar
      Notifications
```

Navigation is defined in `lib/nav.ts`; permissions in `lib/permissions.ts`.

## Code map

Where things live in the repository.

```mermaid
flowchart LR
  REPO["cp repository"] --> APPDIR["app/"]
  REPO --> COMP["components/"]
  REPO --> LIBD["lib/"]
  REPO --> PUB["public/"]
  REPO --> SPEC["Product specification .md"]
  APPDIR --> AUTH["(auth): login, passwords"]
  APPDIR --> APPG["(app): portals and shared pages"]
  APPDIR --> CLASSR["classroom/[id]: lobby, room, ended"]
  APPDIR --> VAC["vacation: landing and registration"]
  COMP --> CCLASS["classroom: stage, whiteboard, present, breakout"]
  COMP --> CCOURSE["course: modules, viewer, SCORM"]
  COMP --> CASSESS["assessment: builder, grading, gradebook"]
  COMP --> CLAYOUT["layout: shell, sidebar, bells"]
  COMP --> CUI["ui: shadcn on Base UI"]
  LIBD --> LTYPES["types.ts"]
  LIBD --> LSTORE["store.ts"]
  LIBD --> LSEED["data/seed.ts"]
  LIBD --> LACT["actions.ts"]
  LIBD --> LUSER["usernames.ts"]
  LIBD --> LSCORM["scorm/"]
  PUB --> SAMPLES["samples: PDFs and SCORM package"]
  PUB --> SW["scorm-content/sw.js"]
```

Everything multi-step goes through `lib/actions.ts`, so moving to the Laravel API is a data-layer change.
