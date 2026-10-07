# Multi-Tenant LMS & Virtual Classroom
## Frontend Product Specification

**Project Type:** Multi-Tenant Learning Management System + School Management System + Virtual Classroom  
**Frontend Deployment:** Vercel Free Tier  
**Primary Frontend:** Next.js + React + TypeScript  
**UI:** Tailwind CSS + shadcn/ui  
**Status:** Frontend Prototype / Product Design Specification

---

# 1. Product Overview

The platform is a **multi-tenant education platform** combining:

- Learning Management System (LMS)
- School Management System (SMS)
- Virtual Classroom
- Live Video Classes
- Recorded Lessons
- Course/Subject Management
- Student Management
- Teacher Management
- Assessments and Grading
- Academic Session Management
- School, District, Regional and National Analytics
- Role-Based Access Control (RBAC)

The platform will support multiple schools operating independently while allowing a **Super Administrator** to oversee the entire platform.

Each school will operate as a separate tenant.

---

# 2. Core Product Hierarchy

```text
PLATFORM
│
├── Super Administration
│
└── Schools / Tenants
    │
    ├── School Administration
    │
    ├── Academic Sessions
    │
    ├── Programmes
    │
    ├── Classes
    │
    ├── Subjects / Courses
    │
    ├── Teachers
    │
    ├── Students
    │
    ├── LMS Content
    │
    ├── Live Classes
    │
    ├── Assessments
    │
    └── Analytics
```

---

# 3. Multi-Tenant Architecture

Each school is a tenant.

```text
Platform
│
├── School A
│   ├── Administrators
│   ├── Teachers
│   ├── Students
│   ├── Programmes
│   ├── Classes
│   └── Subjects
│
├── School B
│   ├── Administrators
│   ├── Teachers
│   ├── Students
│   ├── Programmes
│   ├── Classes
│   └── Subjects
│
└── School C
    ├── Administrators
    ├── Teachers
    ├── Students
    ├── Programmes
    ├── Classes
    └── Subjects
```

A school administrator must only be able to access data belonging to their school.

The Super Administrator has platform-wide access.

---

# 4. Geographic Structure

The platform is used in more than one country. Ghana is the first; each country has its own regions and districts.

```text
Global
│
├── Country (Ghana, Nigeria, Côte d'Ivoire…)
│   │
│   ├── Region
│   │   │
│   │   ├── District
│   │   │   │
│   │   │   ├── School
│   │   │   └── School
│   │   │
│   │   └── District
│   │
│   └── Region
│
└── Country
```

## 4.1 Countries

- **Each country names its own divisions:**
  - Ghana: Region / District;
  - Nigeria: State / LGA;
  - Côte d'Ivoire: Region / Department.

  Forms, analytics titles and tables use the country's words: "Lagos State", "Ikeja LGA".
- **Each school belongs to one country.** The Add School wizard asks for the country first, then lists only that country's regions and districts. The school edit form does the same. The Import Schools file has an optional `country` column, by name or ISO code; it is blank for Ghana.
- **Demo countries:** the prototype has Ghana, plus Nigeria and Côte d'Ivoire with sample schools, so analytics can compare countries.
- **Production:** another country is added as a `countries` row with its regions, districts and school-code kinds (section 58.1). WAEC and GES EMIS are Ghana's codes; other countries define their own.

The previous single-country hierarchy is kept within each country:

```text
Country
│
├── Region
│   │
│   ├── District
│   │   │
│   │   ├── School
│   │   └── School
│   │
│   └── District
│
└── Region
```

This hierarchy supports global, national (per country), regional, district and school-level analytics (section 43).

---

# 5. School Profile

Each school should have a structured profile.

### Required / Important Fields

```text
School ID
School Name
School Category
School Type (Public / Private)
WAEC Code
GES EMIS Code
Region
District
Address
Phone
Email
Website
Logo
School Status
Date Onboarded
```

### School Category

The level the school teaches:

```text
Basic School (Primary 1–6)
Junior High School (JHS)
Senior High School (SHS)
Technical / Vocational (TVET)
College
University
```

### School Type

```text
Public
Private
```

### Progression

How students move on at the end of each year (section 22.4). The Super Administrator sets it on the school's page; the school can't change it.

- **By class** (Basic School, JHS, SHS and most TVET): a class moves up a level together, and the final year graduates.
- **By student** (universities and most colleges): each student registers for courses every semester and progresses on their own results.

New schools take it from their category: University and College schools progress by student, all others by class.

### GES EMIS Code

The EMIS (Education Management Information System) code is issued by the **Ghana Education Service (GES)**, just as the school code is issued by WAEC. It is shown and collected everywhere as "GES EMIS code".

The Super Administrator's school list can be filtered, sorted and exported by category and by public/private type.

### School Status

```text
Active
Suspended
Pending
Archived
```

### 5.1 Bulk School Upload

The Super Administrator can upload many schools at once (CSV or Excel). Each upload is made **by school category and school type**: before uploading, the Super Administrator picks the category (Basic, JHS, SHS, …) and type (Public or Private) that the file's schools belong to — e.g. one file of public JHS schools and another of private basic schools. A row may override these with its own `category` / `school_type` columns.

```text
School Name        (required)
Category           (optional per row; defaults to the upload's category)
School Type        (optional per row: Public / Private; defaults to the upload's type)
WAEC / School Code (optional at upload)
GES EMIS Code      (optional at upload)
Region             (optional at upload)
District           (optional at upload)
Address, Phone, Email
School Administrator Name and Email (optional)
```

Any value that is provided is validated (7-digit WAEC code, unique codes, a recognised category and Public/Private type, district must belong to the region). The import summary reports how many schools of each category and type were added. Missing values are allowed so that schools can be onboarded before all their details are known.

### 5.2 Profile Completion Prompt

If any required profile field is missing (WAEC code, GES EMIS code, region, district, address, phone, email), the school administrator is **prompted to provide it the first time they sign in**, and cannot continue setting up the school until the profile is complete.

```text
School Admin signs in
        ↓
Profile incomplete?  ── No ──→ Dashboard / Setup Guide
        │
       Yes
        ↓
"Complete your school profile" (missing fields highlighted)
        ↓
Save → continue school setup
```


### 5.3 Branding and content protection

**Branding.** A school uploads its logo and picks a **primary colour** (buttons, links, highlights) and optionally a **sidebar colour**, from presets or any colour. The logo replaces the initials badge across the app and the interface uses the school's colours for everyone in that school. Text colours, hover tints and the dark-mode version are worked out automatically so any choice stays readable.

**Content protection.** Per school:

- **Recording downloads** — off by default: students **watch recordings on the platform only** (no download button, download disabled in the player, a watermark with the student's name).
- **Teachers can download their class recordings** — off by default: teachers watch recordings of their live classes on the platform only, in the same watch-only player. Administrators can allow all teachers here, or individual teachers on their profile (Section 34.2).
- **Document downloads** — whether students can download PDFs, Word, Excel and other files, or only view them in the platform's document viewer (Section 27.1).

---

# 6. Academic Session Management

Academic Session Management is a **core feature of the platform**.

The system must allow schools to create and manage academic sessions based on:

- Academic year
- Semester / term
- Start date
- End date
- Status

## Academic Session Structure

```text
Academic Year
│
├── Semester / Term 1
│
├── Semester / Term 2
│
└── Semester / Term 3
```

The platform should be flexible enough to support institutions using:

- 2 semesters
- 3 terms
- Other academic structures in the future

---

## 6.1 Create Academic Session

School administrators should be able to create:

```text
Academic Year:
2026/2027

Session Type:
Semester

Semester:
Semester 1

Start Date:
September 1, 2026

End Date:
December 18, 2026

Status:
Active
```

---

## 6.2 Academic Year

Examples:

```text
2025/2026
2026/2027
2027/2028
```

---

## 6.3 Semester / Term

Examples:

```text
Semester 1
Semester 2
```

or:

```text
Term 1
Term 2
Term 3
```

The school should be able to configure its academic structure.

---

## 6.4 Active Academic Session

Only one academic session should normally be marked as **Active** for a school at a given time.

Example:

```text
Current Academic Year
2026/2027

Current Session
Semester 1

Status
● Active
```

---

## 6.5 Active Session and Switching Sessions

**The sidebar only displays the active session** — it is not a switcher. It sits above the navigation, under the school / workspace switcher (for users in more than one workspace, e.g. a school and Vacation Classes). In the Vacation Classes workspace it reads **Active batch** (Section 49.1.7). On phones it is in the sidebar drawer.

```text
● Active session
2026/2027 — Semester 1
```

For people whose role has **academic_sessions.view**, clicking it opens the **Academic Sessions** page; for everyone else it is a label only. If the user is viewing a different session, a small amber line under it says so ("Viewing 2025/2026 — Semester 2").

**Sessions are set and switched on the Academic Sessions page:**

- **School administrators** (Academic → Academic Sessions): **Set active** makes an upcoming session the school's active session (only one at a time; the previous one closes for good — see below), and **View** switches the screens to another session's records. The session being viewed is marked "Viewing now", and **Back to the active session** returns to it.
- **Teachers and students**: see the active session in the sidebar. **Only if an administrator grants their role academic_sessions.view** (Access Control → Permissions) do they also get **Academic Sessions** in their navigation. There they can **View** an earlier session to look back at its classes, grades and recordings, then go **Back to the active session**. They can never change the active session. The built-in Teacher and Student roles don't have this permission by default, and without it, opening the page directly shows "You don't have access to this page".

Viewing a session updates the displayed:

- Classes
- Students
- Subjects
- Enrolments
- Assessments
- Grades
- Attendance
- Live classes
- Course activity
- Reports
- Analytics

### Closed sessions are read-only

When a session closes, its records are kept exactly as they were. **Nobody can change them** — not teachers, not school administrators, not the Super Administrator:

- No grading or regrading, no attendance corrections, no new or edited assessments, content, classes, enrolments or live classes.
- Students can still open the session's courses, lessons, recordings and SCORM packages to look back, but nothing they do is recorded: no progress, no submissions, no SCORM results (packages open in SCORM's review mode).
- Its forums stay readable but take no new threads or replies.
- A live class that was never started before its session closed can't be started any more.
- A closed session **can't be made active again** and its dates can't be edited, so **Set active** is offered only for upcoming sessions. The confirmation names the session that will close and says the closure is permanent.
- Viewing a closed session shows an amber "Records are read-only" banner, and screens hide their editing buttons. Teachers can still open a submission to read it, without the grade fields.

**Work already under way finishes.** A live class that is running when its session closes carries on normally to its end: the teacher keeps the host controls, and its attendance and recording are saved. The platform completes this itself; it is not an exception anyone can use to edit a closed session.

Closing a Vacation Classes batch (Section 49.1.7) follows the same rule.

## 6.6 Moving into the next session

Every session has its own programmes, classes, subjects and class lists (section 7). Before a new session becomes active, it is filled from the one before:

- **Within an academic year** (Semester 1 → Semester 2, Term 1 → Term 2): on the new session, **Copy structure** copies programmes, classes, subjects and teacher assignments from another session. When both sessions are in the same academic year, **Carry students forward** is ticked by default: every current student keeps their class and subject registrations. Graduates and students who have left aren't carried.
- **Into a new academic year**: students aren't copied. Students move up a level through **promotion** (section 22.4), which also copies the classes if the new session has none yet. The Copy structure dialog says so and links to Promotion & Graduation. An empty upcoming session in a new year shows a **Promote students** button.

**Set active** warns when the session has no students yet while the active one has some, and says whether to carry students forward or promote them first.

Schools that progress by student (section 5) don't carry students forward. Their course registrations come in each semester instead (section 22.4).

---

# 7. Academic Data Isolation

Academic data should be associated with the relevant academic session.

For example:

```text
Student
    ↓
Academic Session
    ↓
Programme
    ↓
Class
    ↓
Subject
    ↓
Enrollment
```

This prevents data from different academic years from being mixed.

Example:

```text
2025/2026
└── SHS 1A
    ├── ICT
    └── Mathematics

2026/2027
└── SHS 1A
    ├── ICT
    └── Mathematics
```

Although the class name is the same, the records belong to different academic sessions.

---

# 8. User Roles

The system should support dynamic Role-Based Access Control.

Default roles:

1. Super Administrator
2. School Administrator
3. Teacher
4. Student

Future roles can include:

- Headmaster
- Academic Coordinator
- ICT Coordinator
- Parent
- District Officer
- Regional Officer
- Examination Officer
- Librarian
- Accountant
- Content Manager

---

# 9. Role and Permission Management

Permissions should not be hard-coded exclusively around roles.

The Super Administrator should be able to:

```text
Create Role
Edit Role
Delete Role
Assign Permissions
Remove Permissions
Assign Users to Roles
```

**Each user has exactly one role.** Assigning a new role replaces the previous one. A role that is still assigned to users cannot be deleted until those users are reassigned.

Permissions are managed **one role at a time**:

```text
Access Control → Permissions
        ↓
Select a role (e.g. Teacher)
        ↓
That role's permissions, grouped by category (collapsible)
☑ Courses   ☑ Modules   ☑ Content   ☐ Schools ...
        ↓
Save / Discard
```

The page must not show every role's permissions at once.

## 9.1 Permissions take effect everywhere, immediately

Removing (or adding) a permission changes what every user with that role can do, straight away — no exceptions for teachers or students:

- **Pages** — every page needs a permission (below). Without it the page disappears from the menu **and** opening it by its address shows *"You don't have access to this page"*. This covers the teacher and student portals, recordings, the live classroom and the learning area, as well as the school and platform administration pages.
- **Actions** — buttons check their own permission, so a role can keep a page but lose one action: *Schedule live class* (`live_classes.schedule`), *Start class* (`live_classes.start` — rejoining a running class is still allowed), *End Class* (`live_classes.end` — without it the host can only leave), *New assessment* (`assessments.create`), *Edit / Publish / Close submissions* (`assessments.update`), grading (`assessments.grade`), exporting results and gradebooks (`assessments.export`), course sections (`modules.create/update/delete`), content (`content.create/update/delete/publish`), recordings (`live_classes.recordings`).
- **Already signed in** — people who are signed in when their role changes are affected at once: the page they're on, the menu and the buttons update without reloading. A user whose account is disabled is signed out immediately.

| Page | Needs |
|---|---|
| Teacher / student classes | `classes.view` |
| Teacher / student subjects | `subjects.view` |
| Teacher content, courses, analytics; student learning and courses; the learning area | `courses.view` |
| Live classes (teacher and student), the live classroom, class reports | `live_classes.view` |
| Recordings | `live_classes.recordings` |
| Assessments, quizzes, assignments and grades (teacher and student) | `assessments.view` |
| New assessment | `assessments.create` |
| Teacher's students | `students.view` |
| Academic Sessions (teacher and student) | `academic_sessions.view` |
| School and platform administration pages | the permission shown for each in the navigation (Sections 51–52) |

Dashboards, messages, forums, calendar, notifications, profile and settings are open to every signed-in user. Presenting (Section 32.2) and the whiteboard are part of the live classroom, so they follow `live_classes.view` and the host's class controls.

---

# 10. Permission Categories

## School Permissions

```text
schools.view
schools.create
schools.update
schools.delete
schools.suspend
```

## User Permissions

```text
users.view
users.create
users.update
users.delete
users.import
```

## Student Permissions

```text
students.view
students.create
students.update
students.delete
students.import
students.export
```

## Teacher Permissions

```text
teachers.view
teachers.create
teachers.update
teachers.delete
```

## Academic Permissions

```text
academic_sessions.view
academic_sessions.create
academic_sessions.update
academic_sessions.activate

programmes.view
programmes.create
programmes.update
programmes.delete

classes.view
classes.create
classes.update
classes.delete

subjects.view
subjects.create
subjects.update
subjects.delete
subjects.assign
```

## LMS Permissions

```text
courses.view
courses.create
courses.update
courses.delete

modules.create
modules.update
modules.delete

content.create
content.update
content.delete
content.publish
```

## Live Classroom Permissions

```text
live_classes.view
live_classes.create
live_classes.schedule
live_classes.start
live_classes.end
live_classes.recordings
live_classes.download_recordings   (school and platform admins by default; not teachers — section 34.2)
```

## Assessment Permissions

```text
assessments.view
assessments.create
assessments.update
assessments.delete
assessments.grade
assessments.export
```

## Analytics Permissions

```text
analytics.school
analytics.district
analytics.region
analytics.national
```

## Library Permissions

```text
library.manage
```

`library.manage` lets a role add, edit, show, hide and delete the class library's shared materials (section 25.3). Only the Super Administrator has it by default, because the library reaches every school.

## SCORM Permissions

```text
scorm.upload
scorm.export
```

**SCORM is managed by the Super Administrator only.** By default only the Super Administrator has either permission:

- `scorm.upload` (add SCORM packages to courses). Teachers and School Administrators don't see SCORM when they add or import content.
- `scorm.export` (export courses as SCORM packages).

Both are deliberately separate from the content permissions, so School Administrators and Teachers never receive them automatically. `scorm.export` matters most: It is deliberately separate from the content permissions so School Administrators and Teachers never receive it automatically — an export takes a whole course, including quiz answer keys, off the platform. It can be granted to another platform role if needed.

---

# 10.1 Sign-in Identities and Usernames

Every person has a **platform username** in addition to the names their school uses. The platform username identifies them uniquely across the whole platform, so other existing products (e.g. the school management and admission systems) can integrate against it.

## Platform username (every user)

- Generated by the system when the account is created — never typed in by an administrator. (Used for sign-in by everyone except school administrators, who sign in with their school code.)
- Unique across the platform, e.g. `cp1000417`.
- **Never changes**, even if the person's school, WAEC code, email or staff ID changes. Integrations should store this value.

## School username (students)

- Generated by the system from the **school's WAEC code**, a running number within the admission year, and the **admission year's last two digits**: `0010712-0001-26`, `0010712-0002-26`, … Numbering restarts for each admission year.
- When the student's Student ID (Section 22.1) already uses the WAEC code, the school username **is** the Student ID, so the two never differ.
- Issued automatically when a student is created or imported at a school that has a WAEC code.
- **If the school has no WAEC code yet**, the student is created with only a platform username and signs in with it.
- When the WAEC code is added later (profile completion prompt, School Settings, or by the Super Administrator), the school administrator is prompted to **generate school usernames** for all students who don't have one. A "Generate usernames" action is also on the Students page for as long as any student is missing one. Students are notified of their new username; their platform username keeps working.

### School username and Student ID

The school username is a **sign-in name**; the Student ID (Section 22.1) is the student's **record number** on documents, lists and imports. They are separate:

| | School username (Section 10.1) | Student ID (Section 22.1) |
|---|---|---|
| Purpose | Signing in | Identifying the student's record |
| Format | `WAECCODE-NNNN-YY` | `SCHOOLCODE-NNNN-YY` |
| School without a WAEC code | Not issued — the student signs in with the platform username | Uses the GES EMIS code or short name as the prefix |
| After the WAEC code is added | Generated by the admin ("Generate usernames") | Unchanged |

## School administrators — school code only

School administrators sign in **only** with their school's **WAEC code** or **GES EMIS code** (either one) and their own password. They are **not** given a generated sign-in number, and their email does not work on the sign-in page once the school has a code.

- A school can have more than one administrator; they all use the school's code, and each one's own password decides which account signs in.
- **Until the school has a WAEC or GES EMIS code** (e.g. it was bulk-imported without them, section 5.1), its administrator signs in with their email so they can complete the profile (Section 5.2). As soon as a code is saved, they are told to sign in with the school code from then on.
- The platform-run Vacation Classes workspace has no WAEC/EMIS code, so its coordinators sign in with their email.

## Staff ID (teachers)

- The teacher's staff ID is **collected from the teacher** (entered by the school when the teacher is added or imported).
- Staff IDs are issued by each school, so the same ID can exist at two schools. If a staff ID matches more than one account, the sign-in page asks the teacher to use their email or platform username.

## Signing in

The sign-in page has a single **"Email, username, staff ID or school code"** field and a password:

```text
School administrators → school WAEC code · school GES EMIS code (only)
Students              → school username (WAEC prefix) · platform username · email
Teachers              → staff ID · email · platform username
Everyone else         → email · platform username
```

All sign-in names are case-insensitive. The Vacation Classes "I already have an account" sign-in accepts the same names.

## Where usernames appear

**Wherever a student's name is shown, their username is shown under it** (their school username, or their platform username until the school has a WAEC code). This covers student lists and class rosters, enrolments, submissions and grading, the gradebook, attendance registers, course progress, live-class attendance and reports, vacation registrations, forum posts, messages, and the live classroom's participant list and breakout rooms. Where the name sits inside a sentence (e.g. "Ama Boateng · 0010712-0042-26 · 2h ago"), the username follows the name inline.

- Students list (school and platform username columns, search and export)
- Student and teacher profile pages (a "Sign-in names" card with copy buttons)
- Each user's own Profile page ("Your sign-in names")
- Teachers list (staff ID and platform username, search and export)
- Super Admin Users directory (platform username, search and export)

---

# 11. Super Administrator

The Super Administrator has complete platform-level control.

## Super Admin Capabilities

- Manage schools
- Create schools
- Edit schools
- Suspend schools
- Create school administrators
- Manage all users
- Manage roles
- Manage permissions
- View all programmes
- View all classes
- View all subjects
- View platform activity
- View national analytics
- View regional analytics
- View district analytics
- View school analytics
- View live classes
- View recordings
- View system logs
- Manage platform settings

---

# 12. Super Admin Dashboard

```text
Good Afternoon, Administrator

Platform Overview

┌─────────────────┐
│ Countries       │
│ 3               │
│ GH · NG · CI    │
└─────────────────┘

┌─────────────────┐
│ Schools         │
│ 1,284           │
└─────────────────┘

┌─────────────────┐
│ Students        │
│ 485,320         │
└─────────────────┘

┌─────────────────┐
│ Teachers        │
│ 18,430          │
└─────────────────┘

┌─────────────────┐
│ Active Users    │
│ 362,810         │
└─────────────────┘
```

The **Countries** card counts the countries with at least one active school and lists their codes. It opens Country Analytics. The "Students by country" chart below compares enrolment across countries and links to Global Analytics.

Additional cards:

- Live Classes Today
- Courses
- Assessments
- Assignments
- Platform Storage
- Monthly Active Users

---

# 13. School Administrator

School administrators belong to a specific school.

They can manage:

- School profile
- Academic sessions
- Students
- Teachers
- Programmes
- Classes
- Subjects
- Subject enrolments
- Live classes
- Assessments
- Grades
- Attendance
- School analytics

They cannot access another school's data.

---

# 14. School Administrator Dashboard

```text
School Dashboard

Academic Session
2026/2027 — Semester 1

Students              Teachers
2,430                 82

Classes               Subjects
56                    174

Live Classes Today    Active Students
18                    1,982
```

---

# 15. Teacher

Teachers should be able to:

- View assigned classes
- View assigned subjects
- Manage course content
- Create modules
- Create lessons
- Upload files
- Add external resources
- Create assignments
- Create quizzes
- Create assessments
- Schedule live classes
- Conduct live classes
- View students
- Grade students
- Export grades
- View performance analytics

---

# 16. Student

Students should be able to:

- View enrolled classes
- View enrolled subjects
- Access course materials
- Attend live classes
- Watch recordings
- Submit assignments
- Take quizzes
- View grades
- Participate in chat
- View announcements
- Track learning progress

---

# 17. Programme Management

Programmes should belong to a school and academic structure.

Examples:

```text
General Arts
General Science
Business
Home Economics
Visual Arts
Agricultural Science
STEM
```

### Programme Fields

```text
Programme Name
Programme Code
Description
School
Academic Session
Status
```

### 17.1 Programme & Subject Catalogue

Programmes and subjects come from a **catalogue** maintained by the Super Administrator, so names and codes are consistent across schools (which also makes national analytics comparable).

**Each country has its own catalogue.** Ghana's SHS programmes are not Nigeria's.
- The catalogue page has a country picker.
- Schools see only their own country's catalogue.
- A code only has to be unique within one country: Ghana and Nigeria can both have `GSCI`.
- A school's catalogue request is added to its own country's catalogue when approved.

Schools do not type programmes or subjects in freely. Instead they **select the ones they offer** from the catalogue:

```text
School Admin → Programmes → Add programmes
        ↓
Tick the programmes offered at this school
☑ General Science
☑ General Arts
☑ Business
☐ Visual Arts
        ↓
Added to the current academic session
```

The same applies to subjects.

### 17.2 Catalogue Requests

If a programme or subject the school offers is not in the catalogue, the school administrator **submits a request**:

```text
School requests "Robotics" (subject)
        ↓
Super Admin reviews the request
        ↓
Approve → added to the catalogue (and to the requesting school)
Decline → with a reason
        ↓
Requester receives a notification of the outcome
```

Request fields: type (programme / subject), name, suggested code, description, reason, requesting school, requester, status (Pending / Approved / Declined).

---

# 18. Class Management

Administrators should be able to create classes.

```text
Class Name
Programme
Academic Session
Level
Class Teacher
Capacity
Status
```

Example:

```text
SHS 1A
General Science
2026/2027 — Semester 1
Form Teacher: Mr. Mensah
Capacity: 50
```

**Level** is chosen from the school's own class levels (School Settings → Class levels, section 22.4). A class that still has a level the school has since removed keeps it until it is moved to another level.

---

# 19. Subject / Course Management

Subjects represent the academic courses students take.

Example:

```text
ICT
Mathematics
English Language
Biology
Physics
Chemistry
Economics
Government
```

### Subject Fields

```text
Subject Name
Subject Code
Description
Programme
Academic Session
```

Subjects are selected from the platform catalogue (see 17.1); subjects not in the catalogue are requested (see 17.2).

---

# 20. Teacher Assignment

Administrators should be able to assign teachers to subjects.

```text
Subject:
ICT

Teacher:
Mr. Eric Dzontoh

Classes:
☑ SHS 1A
☑ SHS 1B
☐ SHS 1C
```

---

# 21. Student Subject Registration

Students can be registered for subjects within a class.

Administrators can:

```text
Register Individual Student
Register Entire Class
Bulk Register Students
Remove Registration
```

Example:

```text
SHS 1A

☑ ICT
☑ Mathematics
☑ English
☑ Physics
☐ Economics
```

---

# 22. Student Management

Administrators should be able to:

- Create students
- Edit students
- View students
- Import students
- Export students
- Assign students to classes
- Register students for subjects
- View student activity
- Generate WAEC-prefixed school usernames for students who don't have one (spec section 10.1)

## 22.1 Student ID and index number

Every student carries two identifiers:

| Field | How it is set | Example |
|---|---|---|
| **Student ID** | Generated by the platform, **read-only** — never typed by an admin. Format `SCHOOLCODE-NNNN-YY`: the school's WAEC code (its EMIS code or short name until it has one), the student's auto-generated number within the admission year, and the admission year's last two digits. | `0030501-0001-26` |
| **JHS index number** | Entered by the admin: the student's **10-digit** BECE index number from JHS. | `0012345678` |
| **Admission year** | Entered by the admin: four digits, from 1990 up to next year. | `2026` |
| **Index number** | Derived, **read-only**: the JHS index number followed by the last two digits of the admission year — **12 digits**. | `001234567826` |

- The Add/Edit Student form shows the Student ID and index number filling in live as the admission year and JHS index are typed.
- The index number is **unique across the platform**. Saving a student whose index number is already registered shows "Already registered to *Name (School)*", which also catches a student being added twice or registered at two schools.
- Student lists, the user directory and imports **search and match by index number** (and by JHS index number or Student ID), so a student can be found and mapped between schools, vacation batches and imports with one number.
- The Add Student form is a mobile-first dialog: it scrolls within the screen, groups fields into Student / Admission & identification / Contact, and keeps **Save** pinned at the bottom on phones.

## 22.2 Numeric-only fields

Every field that holds a number accepts **only digits** — letters and symbols typed or pasted are dropped as they are entered (the phone shows a numeric keypad):

- Digits only: index numbers, admission years, IDs, codes, card numbers, CVC, durations, counts, limits
- Decimal: marks, prices, percentages (one decimal point)
- Signed decimal: numeric answers in assessments (a leading minus is allowed)
- Phone: digits, spaces and a leading `+`


## 22.3 Parents and Guardians

Parents and guardians can sign in and follow their children ("wards"). This is decided **per school by the Super Administrator**, because it suits some levels and not others:

- **Where it is set:**
  - in the **Add School** wizard (School step, **Parent access** switch);
  - later on the school's page under Schools, in the School profile card.
- **Defaults:** on for Basic and JHS schools, off for SHS, TVET, colleges and universities, where students are expected to manage their own learning. Imported schools take their level's default.
- **Who can change it:** only the platform. School administrators can't, so it can't be switched on or off without the platform agreeing.
- **Turning it off:** parents can no longer sign in, and the parent pages disappear from the school's menus. Parent accounts and links are kept, so turning it back on restores them.

**School administrators** (where parent access is on):
- **Student → Parents & guardians** adds a parent with name, email, phone and relationship (mother, father, guardian, other). The name and phone start from the guardian already on the student's record.
- The parent receives an invitation to set a password.
- A parent who already follows a brother or sister is **reused**, so one sign-in covers all their children at the school.
- Unlinking a parent from their last child disables the account.
- **Students → Parents & Guardians** lists every parent account, its children, status and last sign-in.
- The permissions are `guardians.view` and `guardians.manage` (school administrators have both by default).

**Parents** sign in with their email and land in the **Parent** portal: Dashboard, My Children and Notifications. For each child, in the school's active session, they see:
- **At a glance:**
  - learning progress;
  - average score and grade;
  - live-class attendance;
  - work due, with overdue or missed work flagged;
  - when the child last signed in.
- **Subjects:** each subject's teacher and how much of the course is completed.
- **Grades:** each marked assessment with its score, WAEC grade and the teacher's feedback.
- **Work:** every assignment, quiz and test, marked to do, overdue, submitted, graded or missed.
- **Live classes:** coming up, and for each class held whether the child attended, joined late, left early (in the room for less than three quarters of the class) or missed it, with minutes attended.
- **Activity:** lessons completed, work handed in and live classes joined, newest first.

Parents only ever **read**. They can't:
- see other students, class forums, messages or teaching pages;
- change work, grades or attendance.

A parent opening any other portal's page gets "You don't have access to this page".

**On phones** the parent pages fit the screen with no sideways scrolling: the child's tabs wrap onto two rows, grades and live-class attendance show as one row per item instead of a wide table, and dates under "Due next" and "Next live classes" go under the title. The school's **Parents & Guardians** list does the same, one row per parent.

Vacation Classes have no parent portal. There, guardians are kept informed by the SMS alerts in section 49.1.8.

## 22.4 Promotion, repeating and graduation

At the end of each academic year, students move up a level, repeat it, graduate or leave. Last year's records never change: a student who was in **2A1** in 2026/2027 and is promoted to **3A1** has a class place in each year's session, and both stay on their record. Their **Class history** card (on the student's page) lists the class they were in each session.

This section applies to schools that progress **by class** (section 5). Vacation Classes run in batches and have no promotion.

### 22.4.1 Class levels

Each school has an ordered list of levels in **School Settings → Class levels**, lowest first. The last level is the **final year**: students who complete it graduate.

| Category | Default levels | Final year |
|---|---|---|
| Basic School | Basic 1 – Basic 6 | Basic 6 |
| JHS | JHS 1 – JHS 3 | JHS 3 |
| SHS | SHS 1 – SHS 3 | SHS 3 |
| TVET | Year 1 – Year 3 | Year 3 |
| College, University | Level 100 – Level 400 | Level 400 |

Administrators can add, rename, reorder and remove levels:
- A school that runs Basic and JHS together adds JHS 1–3 after Basic 6. Basic 6 then moves on to JHS 1, and JHS 3 is the final year.
- Renaming a level renames it on the classes of the active and upcoming sessions; closed sessions keep the name they had.
- A level can't be removed while classes in the active or upcoming sessions use it.
- **Use the default levels** puts back the category's list.

Class forms offer only the school's levels (section 18).

### 22.4.2 Promoting students

**Academic → Promotion & Graduation** (permission **students.promote**, which School Administrators have) walks through four steps.

1. **Sessions.**
   - **Promote from:** normally the last session of the year that's ending. It can be closed already, since promotion only reads it.
   - **Into:** an upcoming session of a later academic year that has no students yet in any of its sessions, normally its first term or semester.
   - If the new year doesn't exist yet, the page links to Academic Sessions to create it. If the target session has no classes, **Copy classes** copies last year's programmes, classes, subjects and teacher assignments into it.
2. **Classes.** Each class of the old year is matched to a class one level up: the same programme and the same stream, read from the class name (2A1 → 3A1, SHS 2B → SHS 3B, JHS 1 Gold → JHS 2 Gold). If only one class of that programme exists at the next level, it is used. The administrator can change any match. Final-year classes show **Graduates**. A class whose level isn't on the school's list gets a warning, because it has no next level.
3. **Students.** One class at a time, every current student is listed with an outcome:
   - **Promote** (the default below the final year): to the matched class.
   - **Repeat:** to the class at the same level next year with the same stream. The administrator can pick another.
   - **Graduate** (the default in the final year, and only offered there).
   - **Leave the school:** the student is marked withdrawn and can't sign in. Their account stays open if they still study elsewhere on the platform, such as Vacation Classes.

   Any student can be sent to a different class. Students who already graduated or left don't appear.
4. **Review.**
   - Counts of students promoted, repeating, graduating and leaving.
   - How many students each new class will have, with a warning above its capacity.
   - For graduates: the graduation date (default: the end of the old session), the cohort (default "Class of 2027") and how long they keep alumni access.
   - Students left without a class are listed, and **Apply promotion** stays disabled until each has one.

Applying:
- places students in their new classes;
- registers them for the new class's core subjects and for the electives they took last year (matched by catalogue code). A student with no registrations last year gets all the class's subjects;
- marks graduates and leavers.

It is recorded in the audit log.

**Undo.** The page lists every promotion. Until the target session becomes active, **Undo** removes the class places and registrations the promotion created, and makes its graduates and leavers current students again. After that the new year's records are real records and change one at a time. Only one promotion can be applied into an academic year, and the page only offers years whose sessions have no students yet; undo it to run it again.

### 22.4.3 Graduation

Final-year students graduate in the promotion. They can also graduate earlier, since SHS 3 and JHS 3 students usually leave after WASSCE or BECE, before the year ends:
- A final-year class's page has **Graduate class**.
- It asks for the graduation date, the cohort and alumni access, with every current student of the class ticked.
- Graduated students keep their place in the class list with a **Graduated** badge, and promotion leaves them out.

**Alumni access** is chosen per graduation: **30 days**, **3 months** (the default), **1 year**, or **no access after graduating**. Until it ends, a graduate:
- signs in to their **last session**, with a banner saying when they graduated and until when they can look back;
- can open their courses, grades and recordings, but nothing they do is recorded: no submissions and no lesson progress;
- remains followed by their parents, who see that last session.

When it ends, the graduate can't sign in ("Your access ended on …, after you completed school") and their parents no longer see them.

The student's page shows the graduation date, cohort and alumni access. **Reinstate** (permission **students.promote**) undoes a graduation or a leaving made by mistake; the student then needs a class in the session they return to.

**Moving on to another school.** A person's account belongs to the platform and their student record to the school. When a JHS graduate is admitted to an SHS on ClassProject, the SHS creates its own student record for the same person, found by their BECE index number (section 22.1). The JHS record stays as it was.

### 22.4.4 Universities and colleges

Schools that progress **by student** (section 5) don't promote classes together:
- Students register for courses every semester. A course can mix levels, including students retaking it.
- A student moves up a level (Level 100 → 200) when their credits and results allow. They may be on probation, retake courses or defer.
- Programmes last three to six years. A student graduates when they complete their programme's requirements.

For these schools, ClassProject is the learning platform, not the student records system. Course registrations, each student's level and graduations come from the university's records system at the start of each semester, and the Promotion & Graduation page explains this instead of showing the steps. Their Student IDs are their own student numbers; the BECE index fields don't apply.

**Prototype:** the registration import for universities and colleges isn't built yet.
---

# 23. Bulk Student Import

## 23.1 Super Administrator imports

The Super Administrator can import from CSV or Excel too, under **Import Data**: Students, Teachers, Subjects and Programmes. **Every import starts by choosing the country** (Ghana by default).

- **Students:** the Super Administrator picks the school (a searchable list of that country's schools, by name, WAEC or EMIS code) and the academic session. Then the same columns, checks and preview as the school's own import below.
- **Teachers:** the Super Administrator picks the school in that country. The columns are `title, first_name, last_name, gender, email, phone, staff_id, specialization`.
  - Each teacher is invited by email.
  - A blank staff ID is generated in the school's pattern (e.g. `RSHS/STF/014`).
  - Emails already on the platform, staff IDs already used at the school, and repeats within the file are skipped as duplicates.
  - Subjects and classes are assigned afterwards (section 20).
- **Programmes:** the columns are `code, name, description`. They go into **that country's catalogue only**, never directly into a school, and that country's schools then choose from it (section 17.1). A code or name already in that country's catalogue is a duplicate.
- **Subjects:** the columns are `code, name, category (core / elective), programme_codes, description`. They also go into that country's catalogue only. `programme_codes` lists the programmes from the same country's catalogue that an elective usually belongs to (e.g. `GSCI; STEM`); codes not in that catalogue are flagged.

Every import has a **Download template** button and accepts common header variants (e.g. *Surname*, *Programme Code*). Rows with problems can be skipped, so the rest of the file still imports.

## 23.2 School import

Supported formats:

```text
CSV
Excel
```

Workflow:

```text
Upload File
      ↓
Validate Data
      ↓
Preview Records
      ↓
Identify Errors
      ↓
Confirm Import
      ↓
Create Students
```

Columns: `first_name, last_name, gender, date_of_birth, admission_year, jhs_index_number, class, guardian_name, guardian_phone, email`. There is **no Student ID column** — Student IDs are generated on import (Section 22.1). JHS index numbers that lost their leading zeros in Excel (7–9 digits) are padded back to 10 digits with a warning; a full 12-digit index number is accepted and trimmed to the JHS index. Common header names are recognised too (e.g. *BECE Index Number*, *JHS Index*, *Year of Admission*, *Surname*, *DOB*). The preview shows the derived 12-digit index number for every row.

Example validation:

```text
12 records require attention

3 invalid JHS index numbers (must be 10 digits)
4 invalid Classes
3 already registered on the platform (matched by index number)
2 duplicate index numbers within the file
```

---

# 24. LMS Structure

The LMS should use the following hierarchy:

```text
Subject
│
└── Course
    │
    ├── Module
    │   ├── Lesson
    │   ├── File
    │   ├── Video
    │   ├── Assignment
    │   └── Quiz
    │
    ├── Assessment
    │
    └── Live Class
```

---

# 25. Course Modules / Sections

Teachers can create sections such as:

```text
Module 1 — Introduction to ICT

Module 2 — Computer Hardware

Module 3 — Computer Software

Module 4 — Networking
```

Each module can contain multiple content items.


Courses are organised **Moodle-style**: a course is a list of **sections** (e.g. "Week 1 — Introduction", "Topic 2 — Hardware"), each holding lessons, files, videos, links, assignments, quizzes and live classes.

- Teachers add, rename, reorder (drag or move up/down) and delete sections and items.
- **Publishing** — each section and each item is **Published**, **Draft** (hidden from students) or **Scheduled** (published, but visible only from a chosen date and time). A draft or scheduled section hides everything inside it. Badges show the state to the teacher; students only see what is released.

## 25.2 Learning Outcomes and Learning Indicators

Teachers write **learning outcomes** and **learning indicators** for **each lesson** — text lessons, videos, documents, links and SCORM packages (assessments, live classes and recordings don't have them).

- **Learning outcomes**: what learners will be able to do after the lesson (e.g. "Learners can explain the four parts of a computer system").
- **Learning indicators**: how the teacher will see that learners have achieved them (e.g. "Name two input and two output devices").
- Written in the lesson's **Add / Edit content** form, one per line. The platform records when they were last saved and by whom.
- **Never shown to students** — not on the lesson, the course, exports to students, or anywhere in the student portal. Teachers and administrators see them on the lesson page ("Only teachers and administrators see this"), and the course outline marks each lesson **Outcomes and indicators**, **Outcomes only** or **No outcomes**. The course's Content tab reminds the teacher how many lessons still need them.

**Administrators track who has written them** — *Learning Outcomes* for the **School Administrator** (their school, the session being viewed) and the **Super Administrator** (every school's active session, with a school filter):

| Shows | |
|---|---|
| Summary | Lessons; share with outcomes and indicators; outcomes only; not added; teachers complete vs still to finish |
| Per teacher | Lessons, done, outcomes only, not added, % complete, status (**Complete**, **In progress**, **Not started**), last updated |
| Per lesson (select a teacher) | Course, section, lesson, status, how many outcomes and indicators, when updated — school administrators can open the lesson |

Both lists search, filter by status and export to Excel/CSV. A lesson counts as complete when it has at least one outcome and one indicator.

## 25.3 Class library: shared learning materials by subject and level

The Super Administrator publishes **learning materials once, for a subject at a level**, for example **Core Mathematics · SHS 1**. **Every class at that level that takes the subject, in every school**, then gets them inside its own course, so students feel they're part of the class, not on a separate site.

**How it's organised**

- **Subject** (from the catalogue, section 17.1) → **level** (Basic 1–6, JHS 1–3, SHS 1–3) → **topics** → **materials**.
- Materials can be text lessons, videos, documents or links, the same types as course content (section 26). They open in the same viewer, and in the app rather than a new tab.

**What students see**

- In their subject's course, **after the teacher's own sections**, a **Class library** heading introduces the topics: "Learning materials from ClassProject for every SHS 1 class taking Core Mathematics."
- Each topic appears like a course section, labelled **From ClassProject**. The library also shows in the course index, under its own heading.
- Library items **count towards the student's course progress**, and are marked complete the same way as other items.
- A course shows the library for its subject and its class's level only. A class whose level can't be recognised gets no library.

**What the Super Administrator does** (Content → **Learning Materials**)

- Choose a **subject and level**. The page shows who it reaches: the number of schools, classes and students in active sessions.
- **Add, edit, reorder and delete topics and materials**, and **show or hide** either. A hidden topic or material disappears from every class at once.
- A list shows what's already in the library for each subject and level, and selecting one opens it.
- Changes are recorded in the audit log.
- Managing the library needs the **library.manage** permission, which only the Super Administrator has by default (section 10).

**What teachers and school administrators see**

- In the course workspace's **Content** tab, a **Class library from ClassProject** note lists the topics and the number of materials, with **Preview as a student**.
- The library complements the teacher's own sections; it doesn't replace them. Teachers can't edit it.

---

# 26. Content Types

Teachers should be able to add:

- Text lesson
- Video
- **Document**: any uploaded file the platform can show (see below)
- Assignment
- Quiz
- Assessment
- External link
- Live class
- Recorded class
- **SCORM package** (SCORM 1.2 and SCORM 2004): added by the **Super Administrator** only, see 26.2
- **Interactive video**: a video lesson with questions at moments in the video, see 26.3

**Documents.** PDFs, slides, e-books, worksheets and handouts are all one type, **Document**. The teacher uploads the file and the platform works out what it is, labelling it in the course with its own icon:
- PDF;
- Word document (.docx);
- Spreadsheet (.xlsx, .csv);
- Slides (.pptx; converted to PDF when uploaded, and in this demo uploaded as a PDF);
- Image;
- Text file.

The file picker offers only formats the platform's viewer can show, and other files are refused with a message, so students never get a file that can't be opened. A document counts as complete once the student opens it.

**Video or External link?**
- A **Video** plays in the platform's video player (an MP4 link, YouTube or Vimeo), can carry interactive questions (section 26.3), has an estimated duration, and counts as complete when watched.
- An **External link** shows any web page inside the classroom (with "Open in new tab" when the site blocks that) and counts as complete once opened.

Future support:

- Interactive HTML
- H5P
- AI-generated learning content

## 26.2 SCORM Conformance

The platform **always follows SCORM**: it is a SCORM-conformant LMS for **SCORM 1.2** and **SCORM 2004 (2nd–4th Edition)**, and everything it teaches can leave it as a SCORM package. This is a standing requirement for every course, content and tracking feature.

### Import (Content Aggregation Model)

- **Only the Super Administrator adds SCORM packages** (permission `scorm.upload`, section 10). Teachers and School Administrators never see SCORM when they add or import content: it isn't offered in *Add content*, and they can't replace a package already in their course.
- In **Super Admin → Content → Courses**, each course has **Add SCORM**. The Super Administrator:
  - picks the section (a course with no sections gets one called "Interactive lessons");
  - uploads the package: a `.zip` exported from Articulate Storyline/Rise, iSpring, Adobe Captivate, H5P, Moodle or any SCORM authoring tool;
  - sets the title, visibility and whether it counts in the gradebook.
  
  The Super Administrator can also add packages from a course's page after entering a school.
- **Teachers still work with packages already in their courses.** A package appears in the course like any other item, and teachers can:
  - publish, unpublish, move or delete it;
  - write its learning outcomes;
  - see its Learner results and grades.
- The platform reads the package's **`imsmanifest.xml`** (at the root, or inside a single top folder): the SCORM version, the default organization, and every launchable lesson (**SCO**, or asset) with its launch file, `xml:base` paths and parameters.
- Per-SCO settings are honoured: **mastery score** (1.2 `adlcp:masteryscore`), **completion threshold** and **scaled passing score** (2004), and **launch data** (`adlcp:datafromlms`).
- The upload is rejected with a clear message if the file isn't a zip, has no manifest, has no launchable lessons, or a launch file is missing.

### Play (Run-Time Environment)

- Packages open **in the platform's own player** (spec section 27.1): the package runs in a frame beside a list of its lessons with each one's status. Nothing opens in a new tab.
- The player exposes the standard run-time API the package discovers by walking up its parent windows: **`API`** (SCORM 1.2: `LMSInitialize`, `LMSGetValue`, `LMSSetValue`, `LMSCommit`, `LMSFinish`, `LMSGetLastError`, `LMSGetErrorString`, `LMSGetDiagnostic`) and **`API_1484_11`** (SCORM 2004: `Initialize`, `GetValue`, `SetValue`, `Commit`, `Terminate` and the error calls).
- The full **CMI data model** is supported, with read-only/write-only rules, data types, ranges and the standard **error codes** of each version: learner id and name, credit, mode, entry, location/bookmark, lesson/completion and success status, score (raw/min/max, and scaled in 2004), progress measure, session and total time, exit, **suspend data**, launch data, learner preferences, comments, **objectives** and **interactions**.
- The learner id is the student's **platform username** (Section 10.1); the learner name is sent as "Last, First".
- **Status rules applied by the LMS:** the mastery score sets passed/failed (1.2); the completion threshold and passing score set completion and success (2004); a 1.2 lesson that finishes without a status is completed.
- **Resume:** when a learner leaves with `exit = suspend` (or closes the page), their location and suspend data are restored with `entry = resume` next time. Otherwise the next launch starts a new attempt.
- **Time** reported by the package is added to the learner's total time.
- Teachers and administrators open packages in **browse mode**: they can go through the content, but nothing is recorded.
- **SCORM 2004 navigation:** when a SCO ends with a navigation request (`adl.nav.request` = continue, previous, or `{target=ID}choice` / `jump`), the player moves to that lesson; `adl.nav.request_valid.*` answers whether continue, previous or a given target is possible.

### Track and report

- Every commit saves the learner's run-time data for that SCO. A SCORM item counts as **complete in the course** only when the package reports every lesson completed or passed — there is no manual "Mark as complete" for SCORM items.
- **Gradebook:** a SCORM item can **count in the gradebook** (a switch the Super Administrator sets when adding it, on by default). It then has a linked grade item out of 100; each student's **best** package score is recorded there automatically and appears in the gradebook, grade reports and the student's Grades. Teachers can still change a grade. On the student's Assessments list the item opens the package, and scores already earned are carried over when grading is switched on later.
- Under each SCORM item teachers see **Learner results**: every student in the class (name, with username under it) with status (Not started, In progress, Completed, Passed, Failed), score, time spent and last activity, with search and export.

### Export

- Any course can be downloaded as a **SCORM 1.2** or **SCORM 2004 4th Edition** package, so its content can move to any SCORM-conformant LMS.
- **Only the Super Administrator can export** (permission `scorm.export`, section 10). The **Export SCORM** button appears on each course in Super Admin → Content → Courses, and on a course's page for users who hold the permission. School Administrators and Teachers don't see it. Every export is recorded in the audit log.
- Each section becomes a group in the manifest and each item a SCO that reports completion and time through the standard API: text lessons as pages, videos embedded, documents included in the package, links embedded. Imported SCORM packages are carried over unchanged.
- **Quizzes and assessments become self-marking SCORM quizzes**, whether they sit in a section or only on the course's Assessments tab (those form an "Assessments" group). Auto-marked question types (multiple choice, multiple select, true/false, fill-in, numeric, matching, ordering, drag words) are marked exactly as on the platform; each quiz reports its score (raw 0–100, and scaled in 2004), pass/fail against a 50% pass mark (also written as the 1.2 mastery score), and one **interaction** per question (type, weighting, the learner's response, the correct response and the result) in each version's response format. Written answers (short/long answer, essay, file) are recorded as responses but aren't scored inside the package. Live classes are listed with a note that they happen on the platform.
- **Interactive videos** (section 26.3) export as the video followed by a self-marking quiz of its questions (polls are left out), because a SCORM player can't stop the video at each moment.
- Exports are checked by importing them back into the platform (round trip): the manifest is read, every lesson launches, and quiz scores flow into the gradebook.

### Standing rules

- New content types and course features must keep working inside SCORM packages and be representable when a course is exported.
- Progress, completion and scores from SCORM content feed the same course progress and reports as native content.
- In production, packages are unpacked to object storage and served from a separate content domain; the prototype keeps them in the browser and serves them through a service worker.

---

## 26.3 Interactive Video

Teachers can put questions, polls and checkpoints at moments in a video lesson. The video stays an ordinary video: its questions are kept separately, as timestamped questions belonging to the lesson, and the video file is never changed. One video can therefore carry different questions in different courses, and a lesson can get new questions without touching the answers already given.

Interactive questions work with **uploaded video files**, **YouTube videos** and **Vimeo videos**. With Vimeo, playback speed and hiding Vimeo's own controls depend on the video owner's Vimeo plan. Either way, clicks on the picture go to the platform's controls, and a seek made in Vimeo's player still stops at an unanswered required question.

### Question types

- **Multiple choice:** one correct option.
- **True / False.**
- **Multiple select:** several correct options. Partly right answers earn part of the points, exactly as in quizzes (section 37), but only a fully right answer counts as correct.
- **Poll:** no right answer. Students' answers are kept so the teacher sees how the class feels. Polls earn no points.
- **Short answer:** a few words, reviewed by the teacher. The teacher can note what they're looking for (only staff see it). Answers are kept so they can be marked with AI help later.

### Settings for each question

- The **moment in the video** (from 0:00 to the end).
- **Type**, **heading** ("Quick check" when empty), **question** and **extra instructions**.
- **Options** and which are correct.
- **Explanation**, shown with the feedback.
- **Points.**
- **Required** or optional. A required question must be answered before the student can go past that point; an optional one has **Skip**.
- **Allow another try**, with **attempts allowed** (2–5 or unlimited).
- **Show feedback:**
  - on: right or wrong, the explanation, and the correct answer once no tries are left;
  - off: "Answer recorded".
- **Pause the video:** on by default. Off shows the question beside the playing video.
- **Carry on playing after answering:** the video resumes by itself, with no Continue button.
- **Where it appears:** the middle, the bottom or the right-hand side of the video.
- **Concept or outcome checked**, used to flag students who keep missing it (below).

### Rules for the whole video

- **No skipping past required questions:** on by default. Students can always go back; going forward stops at the first required question they haven't answered, which then appears.
- **Complete when they have watched** 50%, 75%, 90% (default) or 100% of the video, **and** answered every required question. Only the parts actually played count, so skipping to the end isn't watching.

### Teacher: the Interactive Video Editor

Open it from a video lesson's menu in the course (**Add video questions** / **Edit video questions**), or from **Edit questions** on the lesson's page. The teacher:

1. plays the video and pauses where a question belongs;
2. chooses **Add at 0:00** (the current moment) and a type, or types a time and chooses **Add at time**;
3. fills in the question on the right; problems (no question, fewer than two options, no correct answer, a time after the end, negative points) show as they type, and saving refuses until they are fixed;
4. adjusts:
   - **drag a marker** along the timeline, or select it and use the arrow keys (Shift for 5 seconds);
   - the list's **arrows** reorder questions;
   - questions can be **duplicated** or **deleted** (with a confirmation);
5. uses **Preview** to try the student experience with the unsaved changes; nothing answered there is recorded;
6. uses **Save draft** to keep working later, or **Cancel changes** to go back to the last save;
7. uses **Publish**.

**Versions.** Editing a published video starts a **draft** (version 2, 3…). Students keep the published questions until the draft is published. Publishing:
- archives the previous version with all its answers, still viewable in Results;
- lets students keep their place in the video.

**Discard this draft** throws the changes away. **Stop showing questions on this video** returns students to the plain video.

**Suggested questions (AI-ready).** For a video with a transcript, **Suggest questions** drafts questions from what is said, each with the moment and the line it came from. The teacher:
- chooses **Add to draft** (then checks and edits it, and it's marked "Suggested");
- or chooses **Dismiss**.

Suggestions never reach students on their own: they only appear once the teacher has accepted them and published the draft. Today's suggestions come from simple rules on the transcript; an AI model will produce them later through the same review steps.

Only the course's teacher, or school staff who may edit content, can change a video's questions. A closed academic session's videos can't be changed (section 6.5).

### Student: watching

- The video plays in the platform's own player, with:
  - play / pause and a seek bar that shows each question as a marker;
  - volume, speed (0.5× to 2×), captions and full screen;
  - keyboard shortcuts: Space or K play / pause, the arrow keys go back or forward 5 seconds, M mute, F full screen, C captions.
- **Resume:** a student who leaves comes back where they stopped ("Resuming from 2:35", with **Start over**). Refreshing the page loses nothing.
- **At a question** the video pauses and the question appears. Two questions close together appear one after the other, and a question at 0:00 appears as the video starts.
- **After answering:**
  - right: "Correct!" with the explanation, then **Continue video**;
  - wrong with tries left: "Not quite. Review the explanation and try again", how many tries are left, **Try again**, and **Continue without retrying**;
  - wrong with no tries left: the correct answer and **Continue video**.
- Results are shown with words and icons as well as colour, are read out by screen readers, and move the keyboard focus to the question and then to the feedback.
- **On phones** the question appears under the video's controls instead of over the picture, so the controls stay usable.
- Under the video the student sees how many questions they've answered, their score and how much they've watched. When complete, the lesson is marked complete in the course and the student sees **Worth reviewing** for any concept they keep getting wrong.
- **If the connection drops while answering,** the answer is kept and **Try sending again** sends it once. A double click or a resend never uses up an extra attempt.
- **Scores are worked out by the platform** from the teacher's correct answers. What the browser sends is never trusted for right/wrong or points.

### Teacher: Results

Under the video on the lesson's page:
- **Students, Started, Completed, Average watched, Average score.**
- **How the class did on each question:** percent correct, with **Difficult** on questions fewer than 60% got right.
- **Opening a question** shows:
  - correct and incorrect percentages, and the share right first time;
  - the first answers per option;
  - the **most selected wrong answer** (the likeliest misconception);
  - the **students struggling**: wrong more than once, or still wrong after their last try.
- **Short answers:** the teacher reviews each one with points and feedback, and the student is notified.
- **Students:** each student's watched %, questions answered, correct answers, score, status and last activity.
- Earlier versions can be picked to see their answers.

### Learning records

Every answer, skip, review, start and completion is also recorded as a learning event: who, what, the concept it checks, right or wrong, the score and how long the answer took. These feed later mastery tracking and spaced-review recommendations. For now the platform only uses them to flag a concept answered wrongly twice in a row, with no right answer since.

---

# 27. External Resource Viewer

Teachers can add:

```text
Resource Name
URL
Description
```

The platform should attempt to display supported external resources inside the application.

If embedding is blocked:

```text
This resource cannot be displayed inside the classroom.

[Open in New Tab]
```

**Video links.** A YouTube or Vimeo link plays in the provider's player inside the classroom, whichever form the teacher pastes:
- YouTube: `youtube.com/watch?v=…`, `youtu.be/…`, Shorts, `/embed/…`, and links with a start time (`?t=42`);
- Vimeo: `vimeo.com/…` or `player.vimeo.com/video/…`.

The platform keeps the link exactly as typed and builds the player address when showing it. YouTube and Vimeo players are sent the page's origin, which they need in order to play (without it YouTube shows "error 153"); other sites are sent nothing. "Open in New Tab" opens the original link.


### 27.1 In-platform document viewer

Every file opens **inside the platform by default** — lesson files, assignment submissions (when a teacher grades them, or a student views their own), and any other attachment. Clicking a file never jumps straight to a new browser tab or a download. From the viewer's toolbar the user can **choose** to open it in a new browser tab, or download it to open in another app (Word, Acrobat, Excel…).

- **PDF** — page by page, zoom, page navigation (rendered with pdf.js)
- **Word (.docx)** — laid out as a document
- **Excel / CSV** — as a table, with sheet tabs
- **Images** and **plain text**
- **PowerPoint** — shown with a message asking the teacher to upload it as PDF (slides are converted to PDF for reliable viewing)

These are also the only formats a teacher can upload as a **Document** (section 26); other files are refused, so every document opens here.

"New tab" and "Download" appear only when the school allows document downloads (Section 5.3); teachers and administrators always have them. Files that aren't lessons (e.g. a submitted assignment) open in a large in-app viewer window over the current page, so the teacher can read the work and go straight back to grading.

---

# 28. Teacher Dashboard

```text
Good Afternoon, Teacher

My Classes
────────────────────

SHS 1A — ICT
42 Students

SHS 2B — ICT
38 Students

SHS 3A — ICT
45 Students
```

Upcoming classes:

```text
10:00 AM
ICT — SHS 1A

[Join Class]
```

---

# 29. Course Workspace

```text
ICT — SHS 1A

45 Students

[Overview]
[Content]
[Assessments]
[Grades]
[Live Classes]
[Analytics]
```

---

# 30. Student Learning Dashboard

```text
Welcome Back, Student

Learning Progress

██████████████░░ 78%

Continue Learning

Introduction to Networking

[Continue]
```

Upcoming:

```text
Live Class
ICT — SHS 1A
Today — 2:00 PM

[Join Class]
```


### 30.1 Learning area

Opening a subject takes the student to a **focused learning area** (`/learn/…`) **without the app sidebar**: the course's sections and their content, a progress bar, and previous/next navigation between items, with a way back to the dashboard. Only released content appears (Section 25).

### 30.2 Live indicators

When a live class is running, a pulsing **LIVE** badge shows on the subject's card and course, and on **Live Classes** in the sidebar, so students can join in one tap. Upcoming lists show only classes that are live or still to come — a class whose time passed without starting is not shown as upcoming (it's reported as *not held*, section 40.1).

---

# 31. Live Classroom

The virtual classroom should provide a modern video-learning experience.

```text
┌───────────────────────────────────────────────┐
│ ICT — SHS 1A                    45 Students  │
├───────────────────────────────────┬───────────┤
│                                   │           │
│                                   │ Live Chat │
│                                   │           │
│          VIDEO AREA               │ Messages  │
│                                   │           │
│                                   │           │
├───────────────────────────────────┴───────────┤
│ 🎤  📹  🖥  ✋  👍  💬  👥  ⚙                 │
│                                               │
│                 End Class                     │
└───────────────────────────────────────────────┘
```

---

# 32. Live Classroom Features

## Video

- Teacher video
- Student video
- View modes (the **View** button in the classroom header; each person chooses their own view):
  - **Speaker** — the speaker, pinned member or shared content large, with a strip of everyone else
  - **Gallery** — all members as equal tiles; if something is being shared, a banner offers to show it
  - **Focus** — the main view only, no strip
- View filters: **Hide members without video**, **Hide self view**
- **Pin** any member to the main view (pin button on their tile; unpin from the tile or the View menu). Pinning only changes your own view.
- Picture-in-picture
- Fullscreen

On phones and tablets the Chat, People and Polls panels open over the video with a **Back to class** button, and the classroom toolbar (with End Class / Leave) stays visible underneath, so the class is always one tap away. Escape also closes the panel.

### Camera background

The teacher can change what's behind them on camera — from the class toolbar (**Background**) or from the lobby before starting:

- **None**, **Slight blur** or **Blur**;
- a picture that comes with the platform (**Classroom**, **Chalkboard**, **Library**, **School blue**, **Plain grey**);
- **their own picture** (uploaded, shrunk and remembered).

- A live preview shows the camera with the effect exactly as students will see it; the change applies straight away, without leaving the class.
- The choice is remembered for the teacher's next class.
- The effect runs on the teacher's device (a small person-detection model); the camera with the new background is what's sent to the class and recorded. If the device can't run it, the normal camera is used and the teacher is told.
- In production the processed camera track is published to the live video provider (LiveKit supports this as a track processor).

### Picture-in-Picture (PiP)

Picture-in-picture must be available:

- **During a live class** — the teacher's (or active speaker's) video can pop out into a floating PiP window so students and teachers can take notes, open course materials or switch browser tabs without losing the class.
- **When watching any video on the platform** — recorded live classes, lesson videos and other video content.

```text
Live Class / Video Player
        ↓
[Picture-in-Picture] button
        ↓
Video floats above other windows and tabs
        ↓
[Back to tab] returns to the classroom / player
```

Where the browser does not support native picture-in-picture, the button should be hidden or the platform should fall back to an in-page floating mini-player.

## Audio

- Mute/unmute
- Speaker controls
- Individual participant mute controls for host

## Communication

- Live chat
- Private chat — future
- Reactions — shown as one small tray in the corner of the stage, grouped by emoji with a count (e.g. 👍 5 ❤️ 2), fading after a few seconds. Reactions never float across or cover the lesson.
- Raise hand
- Announcements

## Teaching

- Screen sharing (with the shared screen's sound — see 32.1)
- File sharing
- Polls
- Quiz
- Whiteboard
- Presentation sharing

## The main stage is the teacher's and is shared with everyone

Whatever the teacher puts on the main stage appears on every student's screen at the same moment:

- **Whiteboard** — every pen stroke appears for students **as it is drawn** (strokes, not images, so it's light on mobile data). The board is 16:9 on every screen so drawings line up exactly. Students see "Whiteboard · view only".
  - **Flip chart pages** — the board works like a flip chart or slides. A strip of page thumbnails under the board (teacher) shows every page: tap one to go to it, **New page** adds a blank page after the current one, and the current page's ⋮ menu offers **Duplicate**, **Move left / right** and **Delete** (with a confirmation if the page has content). Pages keep everything written on them, so the teacher can always go back.
  - **Pin a page / write privately** — by default students see whichever page the teacher is on. **Pin for students** keeps that page on students' screens while the teacher moves to other pages and writes on them **privately** — nothing on those pages is sent to students. When ready, **Show this page to students** puts a page on their screens, and **Unpin — students follow my page** returns to following. Thumbnails mark the page students see (green eye) and private pages (crossed eye), and the board shows "Private — students see page 1 (pinned)" while the teacher is on a private page. Deleting the pinned page returns students to following the teacher. All pages with content are saved to the course at the end of class.
  - **Write on PDFs and pictures** — the whiteboard's **PDF** button (teacher) puts a document on the board to annotate:
    - **Upload** a PDF or picture (PNG, JPG — e.g. a worksheet, past questions, a photo of a textbook page), or **pick a PDF already in the course**.
    - For a PDF, choose the **pages** (up to 40 at a time). **Portrait pages** can go on the board as **top and bottom halves** (bigger, easier to write on; a little overlap so no line is cut) or as the **whole page**. Landscape pages (slides) fill the board.
    - Each page becomes a flip chart page with the document underneath; by default the new pages are **private** (students stay on the page they see) until one is shown.
    - Everything works on top: pen, **highlighter** (see-through, bright colours), shapes, text, equations and graphs. The **eraser removes only writing — never the document**. Undo and "Clear page" also leave the document in place.
    - Students see the document and every mark live when the page is shown to them; students who are allowed to draw can annotate too.
    - Annotated PDF pages are kept in saved flip charts, added to the course at the end of class, and included in the PDF download — with the annotations on the document.
    - The board label shows which document and page is open (e.g. "hardware-worksheet.pdf · page 1 (top)").
  - **Save the flip chart for reuse** — the whiteboard's **Flip chart** menu (teacher):
    - **Save flip chart…** keeps every page with content (private pages included) as **editable pages** under a name, in **Live Classes → Flip charts**. After saving (or opening a saved one), **Save changes…** updates it, or **Save as new** keeps both.
    - **Open a saved flip chart…** lists the teacher's saved flip charts (first-page preview, pages, subject, when saved). Its pages are **added after the current page** — by default **kept private** (students stay on the page they see now until a page is shown) — or **replace the board**. They stay fully editable: keep writing, add pages, then save again.
    - **Add pages to the course now** adds the pages as images to the course's latest section, without waiting for the end of class.
    - **Download as PDF** — one landscape page per whiteboard page, formulas and graphs included.
    - When ending the class, *Save the whiteboard as a flip chart for reuse* (or *Save changes to the flip chart "…"*) is ticked by default whenever the board has content.
  - **Flip charts library** — **Live Classes → Flip charts** (teacher) shows saved flip charts as cards with a first-page preview: view all pages, rename, duplicate, download as PDF, add to any course they teach, or delete (pages already added to courses stay). Flip charts belong to the teacher and can be reused across classes, subjects and sessions.
  - **Presenting on the board vs drawing** — the toolbar's **Whiteboard** button (an easel; it reads **Board & PDFs** when PDFs are on the board and **Hide board** while it's showing) only shows or hides the board. Drawing is controlled by the board's own tools:
    - **Pointer** — look and click without drawing. Imported PDFs open with the pointer, so tapping a page never draws by accident.
    - **Laser pointer** (teacher) — students see a glowing red dot where the teacher points; it fades when the teacher stops moving it.
    - **Pen** — tapping the pen again puts it down (back to the pointer); the board and the presentation stay on screen.
    - **Hide board** goes back to what was showing before the board opened — the lesson presentation or the screen share — instead of the teacher's video, and keeps every page (a message says so). Opening the board no longer stops a screen share.
  - Tools: pointer, laser pointer, pen, **highlighter**, **shapes** (line, arrow, rectangle, circle/ellipse, triangle — drag to draw), **text** (tap the board, type, Enter), **graph plotter**, eraser, colours, size, undo (your own last item), clear page and download page. On phones the tools sit in a strip above the board so they never cover it.
  - **Equations and formulas (LaTeX)** — the **∑** tool: tap where it should go, then type LaTeX or start from symbol buttons (fraction, root, powers, subscripts, ±, ×, ÷, ≤, ≥, ≈, ∞, Greek letters, ∑, ∫, limits, vectors, degrees, growing brackets, matrices) and ready-made formulas — maths (quadratic formula, Pythagoras, series, integrals, simultaneous equations), physics (Newton's second law, equations of motion, E = mc², Ohm's law, gravitation, waves) and chemistry (`\ce{2H2 + O2 -> 2H2O}`, equilibria, ions). A live preview shows exactly what goes on the board; mistakes (e.g. a missing brace) are explained and must be fixed first. Text typed with the text tool can include maths between `$…$` (e.g. "Speed: $v = \frac{d}{t}$ in m/s"). Formulas are rendered by MathJax as vector shapes, so they're sharp at any size, identical on every screen, and kept in saved board images; MathJax loads only when a board uses maths.
  - **Graph plotter** — *Plot a graph* takes up to four functions of x (e.g. `2x + 1`, `x^2 - 4`, `sin(x)`, `1/x`; powers, brackets, implicit multiplication such as `3(x+1)`, sin cos tan sqrt abs ln log exp, pi, e) and/or lists of coordinates (`(1, 2) (3, 5)` or one pair per line), with options to join points and show their coordinates. Axes, grid, tick labels and a key are drawn automatically; the range fits the data (or is set by hand). A live preview shows the result; the graph goes on the left half, right half or whole board. Graphs are stored as their definition, so they stay sharp at any size and on every screen. Expressions are parsed safely (no code execution) and gaps/asymptotes aren't joined.
  - **Who can draw** (whiteboard tools): *Only me*, *Everyone*, or **ask one student to answer** — only that student can draw until the teacher picks someone else or *Only me*. The student is told "Your turn — answer on the board"; everyone else sees "*Name* is answering". Several specific students can be allowed from their ⋮ menu in Participants (*Let draw on whiteboard*); a pen icon marks them in the list. Students who may draw get the same tools (except clear, pages and download).
  - **Saved to the course** — when the class ends, each whiteboard page is added to the course (latest module) as an image, "Whiteboard — *class title* (page n)".
- **Presentation** — the lesson the teacher presents appears for everyone.
- **Screen share** — the teacher's screen (with sound, section 32.1) appears for everyone.
- Stopping any of them takes everyone back to the teacher's video. Students watching in Gallery view are switched to the shared content and told what the teacher opened.
- **Late joiners and reconnects** get the current stage — including the whole board so far — as soon as they join.
- When the teacher ends the class, every student's screen goes to the class-ended page.

Production: stage changes and strokes travel on the video provider's data channel; screen share is a video track. The prototype relays them between browser tabs (sign in as the teacher in one tab and a student in another), relays screen share as still frames, and — when no teacher tab is open — a simulated teacher presents, then draws a diagram on the whiteboard stroke by stroke and briefly lets students draw.

## Pause and continue

**Pause for a break** — the teacher taps **Pause** in the toolbar and picks 5, 10, 15, 20 or 30 minutes.

- Everyone sees "Class paused — back in 9:32" with a countdown; chat and the toolbar stay usable, and everyone's mic and camera are turned off.
- The REC badge shows **PAUSED**: the break is cut from the recording, and **attendance minutes stop counting** — nobody is credited or marked late for the break. Class length in reports leaves breaks out.
- The teacher can add 5 minutes or **Resume class** at any time; when the time is up students see "Break's over — the teacher will resume shortly".
- Students opening the lobby during a break see "Paused for a break — back about 10:45. You can join now."

**End and continue later** — **End Class** offers *End class* or *End and continue later*:

- Continue later makes this sitting **Part 1** and schedules **Part 2** (date, time and length chosen by the teacher) with the same title, member permissions and removed members.
- Students are notified when it continues; the class reports link Part 1 ↔ Part 2.

## Breakout rooms

The teacher taps **Breakouts** in the toolbar:

1. **Set up** — number of rooms (with "about N students each"), room names, and how students are placed: **Automatically** (shuffled, with Reshuffle), **Manually** (pick a room per student) or **Let them choose**. Time in rooms: 5–30 minutes or no limit; *Bring everyone back when time is up* (30-second countdown, one-minute warning); *Students can go back to the main room on their own*.
2. **Open rooms** — students are moved into their room. Each room has **its own whiteboard that everyone in the room can draw on**, and shows only its members. Students who choose see a list of rooms to join; students who arrive late go to the smallest room.
3. **While rooms are open** the teacher sees every room: members (who's talking), whiteboard activity, **Needs help** flags (students tap **Ask for help**), a **Broadcast** box that messages every room, **+5 min**, and a list to send unplaced students to a room. **Join** takes the teacher into a room (students see "Teacher is here"); **All rooms** goes back to the overview.
4. **Close rooms** — everyone gets a 30-second countdown and returns to the main room. Each room's whiteboard is saved to the course ("Group 3 whiteboard — *class title*").

Time in a breakout room counts as time in class. The recording covers the main room; the class report lists each breakout round (groups and duration).

## Classroom Management

- Participant list
- Attendance
- **Mute a member** — tap the green mic on their row (or Mute in their ⋮ menu)
- **Turn off a member's video** — tap the green camera on their row (or Turn off video in their ⋮ menu)
- **Mute all** — asks first: *Mute me too* (off by default, so the teacher keeps talking) and *Let members unmute themselves*
- **Stop all video** — turns off every member's camera once; they can turn it back on if video is allowed
- **Members can turn on their video** (on/off) — off stops every member's video and keeps it off; members see the video button locked ("Video off by teacher")
- **Members can unmute themselves** (on/off) — off keeps members muted; they see "Muted by teacher" and are prompted to raise their hand. The host can still mute anyone at any time.
- **Remove from class** (with confirmation) — the member leaves immediately and **can't rejoin, even from the lobby**, until the host taps **Let back in** in the Removed list (or the toast's undo). Their attendance up to removal is kept. Removals and member permissions are saved on the live class, so they survive the teacher reloading or rejoining.
- Lock classroom
- Waiting room (members let back in go through it when it's on)

## 32.2 Presenting

**Present** (in the class toolbar) opens a picker. The teacher chooses what to show:

| Source | Formats |
|---|---|
| A lesson from this course | The course's text lessons (drawn onto 16:9 pages; long lessons flow onto several pages) |
| A document from this course | The course's PDFs and pictures |
| A file from the computer | **PDF, JPG, PNG, GIF, WebP** |

- PowerPoint, Word and Excel files are presented by **saving them as PDF first** (File → Save as → PDF) — or, to show them in their own app, by **sharing the screen** (a button for this is in the picker). Phones and tablets can't share their screen (Section 32.1), so on those devices teachers present a lesson or document instead.
- For a PDF the teacher chooses the pages (up to 40 at a time) and whether tall pages are shown whole or as top and bottom halves.
- What is presented opens **on the board, shown to the class straight away** (students follow the teacher's page), so everything the board does works while presenting:
  - **Turn pages** with the page strip under the board;
  - **Annotate**: pen, highlighter, shapes, text and equations on top of the page — the eraser never removes the document;
  - **Laser pointer** (teacher): a red dot that follows the mouse (or finger) and appears on every student's screen on the same spot, on the page it is pointing at; it disappears when put away or after a moment without movement;
  - **Zoom** (everyone, each on their own screen): zoom in/out buttons from 100% to 300%, Ctrl + mouse wheel or a trackpad pinch, and drag the zoomed page with the Move tool (students just drag). Zooming never changes what others see.
- Clicking **Present** again stops presenting and returns the stage to the teacher's video. The presented pages stay on the board (and can be saved as a flip chart, section 32).

### Full screen and pop-ups

The class's **Fullscreen** button makes the whole page full screen, so every menu and dialog — Pause, Present, PDF, Flip chart, "Who can draw", breakout room settings — opens and works in full screen too.

## 32.1 Screen Sharing with Sound

**Phones and tablets.** Mobile browsers (Android Chrome, iPhone/iPad Safari) don't let *websites* capture the screen — only installed apps can, using the phone's own screen-recording permission. So on a phone or tablet (including iPads, which present themselves as Macs) the **Share screen** button opens an explanation — *"Screen sharing isn't available on phones and tablets"* — with one-tap alternatives, **Present the lesson** and **Open the whiteboard**, and a note to join from a laptop or desktop to share the screen. This is decided by the device, because some mobile browsers expose screen sharing and then refuse it. On computers, a failed attempt says what happened: cancelled or blocked (with the macOS screen-recording permission hint), or not supported by that browser. Screen sharing from a phone becomes possible when ClassProject ships as an installed app (Android and iOS) using the video provider's mobile SDK (Section 67).

When the teacher shares their screen and plays a video (YouTube, a media player, a slide with embedded video, any application), **students must both see the video and hear its sound**.

- The screen share captures the **picture and the sound** of what is shared. The sound is sent to students as its own audio track, alongside the teacher's microphone, so students hear both the video and the teacher talking over it.
- Screen-share sound is sent without voice processing (no echo cancellation, noise suppression or automatic gain), so music and video sound are not distorted.
- When sound is being shared, the share is optimised for smooth motion (video playback); a share without sound is optimised for sharp text (slides, documents, code).
- The teacher sees a **"Sharing sound"** badge with a live level meter on the shared screen, so they can confirm the video's sound is reaching the class.
- If the browser shares no sound, the teacher sees a **"No sound shared"** badge and a message explaining how to share it again with sound.
- The teacher's own preview of the share is muted, so they don't hear the video twice. Teachers should use headphones while playing video sound, so their microphone doesn't pick the sound up from their speakers.
- The recording of the class includes the screen-share sound.

What the browser can share with sound:

```text
What is shared            Chrome / Edge (desktop)                 Firefox, Safari
─────────────────────     ───────────────────────────────────     ───────────────
A browser tab             Yes — tick "Share tab audio"            No sound
Entire screen             Yes on Windows and ChromeOS — tick      No sound
                          "Share system audio"
A single app window       No sound (browser limitation)           No sound
```

So to play a video from a desktop application with sound, the teacher shares their **entire screen** (Windows/ChromeOS) or opens the video in a **browser tab** and shares that tab. Phones and tablets cannot share their screen from the browser.

---

# 33. Live Class Workflow

```text
Schedule Class
      ↓
Students Receive Notification
      ↓
Pre-Class Lobby
      ↓
Teacher Starts Class
      ↓
Students Join
      ↓
Live Video
      ↓
Chat / Poll / Screen Share / Reactions
      ↓
Teacher Ends Class
      ↓
Recording Processing
      ↓
Recording Saved
      ↓
Recording Added to Course
```

## 33.1 Scheduling a live class

The **Schedule live class** window (a wide dialog) collects:

| Field | Notes |
|---|---|
| Course | Only when the teacher has more than one course |
| Topic | Required |
| Description | Optional — what the class covers and anything students should prepare. Shown in the pre-class lobby and in live class lists. |
| Date | Required |
| Start time | Required |
| End time | Required; must be after the start time. Moving the start time keeps the same class length. |
| Length shortcuts | 30 min, 45 min, 1 h, 1 h 30 min, 2 h — set the end time from the start time |
| Waiting room | Admit students manually |

A class must be at least 10 minutes and at most 6 hours, and cannot start in the past.

### Status in live class lists

The status follows the clock, not only the stored state, so a class that is due can always be started from the list:

| Status | When | Action |
|---|---|---|
| Scheduled | More than 15 minutes before the start | — |
| Starts in N min / Due now | From 15 minutes before the start until the planned end, while not started | Teacher: **Start class** (opens the lobby to start). Students and staff: **Open lobby** (wait for the teacher) |
| Live | The teacher has started it | Teacher: **Return to class**. Others: **Join** |
| Not held | The planned end passed without the class being started | **Report** |
| Ended | The teacher ended it, or its time was up | **Recording** and **Report** |

The planned length (end − start) is shown as the times are chosen, and the lobby shows the class as "4:00 PM–5:30 PM · 90 min".

### When the class ends

- A live class **ends by itself at its planned end**: the scheduled end time, pushed back by any breaks the teacher took. The class header shows "Ends 5:35 PM", then "Ends in N min" in the last 10 minutes; the teacher is warned 5 minutes and 1 minute before.
- At the end the recording and attendance are saved exactly as if the teacher had pressed **End class**. To carry on another time the teacher uses **End class → continue later** (Part 2).
- It ends on time even if the teacher isn't there: in production a server job ends classes whose time is up; the prototype does it from any open page.

### If the teacher's connection drops

- **Students stay in the class.** Nobody is removed, and the class keeps running and recording.
- Students see "Mr. Dzontoh lost connection. Stay in class — they'll be back as host. The class ends at 5:35 PM."
- **Nobody else is ever made host.** The subject teacher is always the host: when they rejoin (from the same or another device) they come straight back as host, with their whiteboard as it was.
- If the teacher doesn't return, the class still ends at its planned end.

### One session per person

- A person can be in a class from **one device or browser at a time**.
- If they open the class somewhere else while already in it, the lobby warns: "You're already in this class on Chrome on Windows (since 4:36 PM). If you join here, that session will close."
- Joining anyway **closes the older session**, which shows "This session closed because you joined the class on …". A student's time in the older session is kept in their attendance; a teacher's whiteboard carries over to the new session.
- In production the live video provider enforces this across devices (a second connection with the same identity replaces the first).

---

# 34. Live Class Recording

When the teacher ends the class:

```text
Class Ended

Processing Recording...

████████████████░░ 82%
```

After processing:

```text
Recording Ready ✓

ICT — SHS 1A
25 September 2026
Duration: 01:24:32

[Watch Recording]
[Download]
```

Recordings should automatically be associated with:

```text
School
Academic Session
Class
Subject
Teacher
Live Session
Date
Recording
```


### 34.1 Recording library

Recordings are shown as **thumbnails** (a video card with the subject name and colour, class, title, date and length) in a grid, for students, teachers and administrators. They play in the platform's own player with picture-in-picture; downloads follow the school's setting (Section 5.3).

### 34.2 Who can download recordings

Live class recordings are **watch-only by default for students and teachers**: no download button, download disabled in the player, and a moving watermark with the viewer's name.

| Viewer | Can download a class recording when… |
|---|---|
| Student | the school allows student recording downloads (Section 5.3) |
| Teacher | the school allows teachers to download (Section 5.3), **or** a school administrator turned on **Allow downloading class recordings** on that teacher's profile (Teachers → the teacher), **or** the teacher's role has the **Download class recordings** permission |
| School administrator, Super Administrator | always (their roles include **Download class recordings**) |

Granting or removing a teacher's permission is recorded in the audit log. Videos a teacher uploads as lesson content are theirs and stay downloadable for them.

---

# 35. Assessment System

Teachers should be able to create:

- Assignments
- Quizzes
- Class tests
- Projects
- Examinations
- Other assessments


Quizzes, assignments, tests, projects and examinations are all **assessments** and live together under **Assessments** in the navigation (with filters by type), for teachers, students and administrators.

---

# 36. Assessment Builder

```text
Create Assessment

Title
Description
Subject
Class
Academic Session

Assessment Type
○ Quiz
○ Assignment
○ Test
○ Project
○ Examination

Total Marks
Duration
Due Date
```


### 36.1 Builder features

- **Images** — a question can have a picture (upload or link), and **multiple-choice / multiple-select options can be pictures** too (with or without text). Images can be enlarged.
- **Maths** — question text and options support LaTeX between `$…$` (inline) or `$$…$$` (display), rendered with KaTeX, with a live preview in the builder and the same rendering for students.
- **Shuffling** — *Shuffle questions* gives each student their own question order; *Shuffle answer options* gives each student their own option order for multiple choice / multiple select. The order is fixed per student (the same if they reload), and marking is unaffected.
- **Import questions** — from CSV or Excel, one question per row, with a downloadable template. Columns: `type, question, marks, options, answer, tolerance, image`. Options are separated by `|` (choices; items in the right order for ordering; `term=match` pairs for matching; extra wrong words for drag-words). Rows are checked before import and problems explained per row.

---

# 37. Question Types

Future-ready question builder:

```text
Multiple Choice
True / False
Short Answer
Long Answer
Essay
Matching
Fill in the Blank
File Submission
```


### 37.1 Supported question types

| Type | How students answer | Marking |
|---|---|---|
| Multiple choice | Pick one option | Automatic |
| Multiple select | Tick all that apply | Automatic (all correct, none wrong) |
| True / False | Pick one | Automatic |
| Fill in the blank | Type into each gap (`______`) | Automatic; several accepted answers per gap |
| Numeric | Type a number | Automatic, within a ± tolerance |
| Matching | **Drag** each term onto its match (or tap to pick) | Automatic |
| Ordering | **Drag** items into the right order | Automatic |
| Drag words | **Drag** words into the gaps in a sentence (with extra wrong words) | Automatic |
| Short answer | Type a short answer | Teacher (model answer shown) |
| Long answer / Essay | Write at length | Teacher |
| File upload | Upload a file | Teacher |

Dragging works with mouse, touch and keyboard.

---

# 38. Gradebook

Teachers should see:

| Student | Assignment | Quiz | Test | Total |
|---|---:|---:|---:|---:|
| John Mensah | 18 | 8 | 42 | 68 |
| Ama Boateng | 20 | 10 | 45 | 75 |
| Kojo Mensah | 15 | 7 | 38 | 60 |

Actions:

```text
[Export Excel]
[Export CSV]
[Print]
```

---

# 39. Student Performance

Teacher view:

```text
Student Performance

John Mensah

Assignments     82%
Quizzes         76%
Tests           71%

Overall         76%
```

Class performance:

```text
Average Score       68.4%
Highest Score       94%
Lowest Score        32%
Pass Rate           78%
```

---

# 40. Attendance

Attendance should be supported for:

- Physical classes
- Live classes
- Course activities

Live class attendance can automatically capture:

```text
Student
Join Time
Leave Time
Duration
Attendance Status
```

Example:

```text
John Mensah
Joined: 10:02 AM
Left: 11:17 AM
Duration: 75 minutes
Status: Present
```

### Leaving and rejoining

A student who leaves (or loses connection) and rejoins before the class ends keeps **every stretch** they spent in the room, in one attendance record:

```text
John Mensah
In the room: 10:02–10:20, 10:26–11:17
Joined: 10:02 AM (first join)     Left: 11:17 AM (last leave)
Time in class: 69 minutes (time away not counted; breaks not counted)
Status: Present · rejoined 1×
```

- **Joined** is the first join and **Left** the last leave; **time in class** adds up only the stretches in the room, minus any breaks (Section 32).
- **Late** is judged on the first join (more than 10 minutes after the teacher started, not counting breaks) — rejoining never makes a student late.
- Stretches recorded on the student's own device (when they leave, rejoin, switch device, or are still in class when it ends) and what the classroom saw are combined; ending the class never overwrites them.
- The class report's timeline shows each stretch and "rejoined N×".


### 40.1 Live class accountability reports

Every live class records **when it was scheduled, when the teacher actually started and ended it, and who attended for how long** (each join and leave, so reconnections are counted; breaks are excluded, section 32).

- **Teachers' delivery** (school and platform *Live Classes → Reports*): classes due, **held**, **not held** (the time passed without the teacher starting), cancelled, delivery rate, on-time rate (started within 5 minutes), average late start, total and average minutes taught against planned, and attendance in their classes — for **this week, this month, this term/semester or this academic year**, with a trend chart.
- **Students' attendance**: classes expected and attended, late, attendance rate, total minutes, **average minutes per class**, average share of each class attended, and **average minutes per week** — for the same periods, filterable by class; students see their own on their live page.
- **Class report** (`/live-report/…`) for each class: scheduled / started / ended times, length, lateness, a timeline bar per student showing when they were in the room, parts (Part 1 / Part 2), breaks and breakout rounds.
- Everything exports to Excel/CSV.

---

# 41. Notifications

Notifications should support:

```text
New Assignment
New Quiz
New Course Material
Upcoming Live Class
Live Class Starting
Assignment Graded
New Announcement
Recording Available
```

## 41.1 Notification and Message Icons

Every authenticated page must show, in the top navigation bar:

```text
🔔 Notifications  (unread count badge)
💬 Messages       (unread count badge)
```

- The **notification icon** opens a dropdown of recent notifications with "Mark all as read" and "View all".
- The **message icon** opens a dropdown of recent conversations and forum activity with "Open messages".

## 41.2 Messages

Users can exchange direct messages, subject to the same school and role boundaries as the rest of the platform:

- Students can message teachers who teach them
- Teachers can message students they teach and staff at their school
- School administrators can message staff at their school
- Nobody can message users in another school

## 41.3 Class & Subject Forums

Each **course** (one subject taught to one class in one academic session) has its own discussion forum.

```text
School
  └── Academic Session
        └── Class (e.g. SHS 1A)
              └── Subject (e.g. ICT)
                    └── Forum
                          ├── Thread
                          │     └── Replies
                          └── Thread
```

Rules:

- A student sees and posts **only** in the forums of the class and subjects they are registered for
- Students cannot chat outside their class and subject
- The subject teacher moderates the forum (pin, lock, delete posts)
- School administrators can view all forums in their school
- Forums are academic-session aware — a new session starts with new forums

Forum features:

- Create thread
- Reply to thread
- Pin thread (teacher)
- Lock thread (teacher)
- Delete post (teacher / author)
- Mark thread as question and accept an answer
- Unread indicators


### Live class alerts

When a teacher starts a live class, every student in that class is told at once:

- **In the app** — a notification, and the LIVE badges (Section 30.2).
- **On the device** — a system notification (also when ClassProject is installed as an app on Android/iOS, via its service worker); tapping it opens the class lobby.
- **By email** — to students with an email address who haven't turned live-class emails off in their preferences, with a link to join.

---

# 42. Calendar

Calendar should display:

- Live classes
- Assessments
- Assignment deadlines
- Academic session dates
- School events
- Course activities

---

# 43. Analytics

Analytics should exist at multiple levels.

```text
Global
   ↓
Country (national)
   ↓
Region
   ↓
District
   ↓
School
   ↓
Programme
   ↓
Class
   ↓
Subject
   ↓
Student
```

---

## 43.1 Global and country analytics

The platform is used in several countries, so analytics start above the national level:

- **Global Analytics** (Analytics → Global) shows every country's totals and a table comparing countries. Each row opens that country's national view. It needs the `analytics.global` permission.
- **Country Analytics** (Analytics → Countries) charts engagement by country and lists them side by side.
- **National analytics per country** (`/super-admin/analytics/countries/<country>`) is the section 44 view for one country, broken down by its regions or states. It needs `analytics.national` or `analytics.global`.
- **Regions, Districts and Schools** list every country's entries, with a country filter in the page header. Titles and table headings follow the country's own division names, so Nigeria shows "States" and "LGAs".
- Breadcrumbs run Analytics → country → region → district → school.

Side menus in every portal read **A–Z** (section 50.1).

# 44. National Analytics

Super Admin should be able to see:

```text
Total Schools
Total Students
Total Teachers
Monthly Active Users
Daily Active Users
Live Classes
Course Activity
Assessment Activity
Assignment Submissions
Average Engagement
```

---

# 45. Regional Analytics

Example:

```text
Greater Accra

Schools             240
Students            82,400
Teachers            4,320
Active Users        74,300

Live Classes        1,820
```

---

# 46. District Analytics

Example:

```text
Accra Metro

Schools             85
Students            31,200
Teachers            1,840

Student Activity    91%
Teacher Activity    87%
Live Class Usage    79%
```

---

# 47. School Analytics

```text
School Performance

Students
2,430

Teachers
82

Active Students
2,104

Active Teachers
74

Live Classes
324

Assignments
1,280

Quizzes
845
```

---

# 48. Student Engagement Analytics

Track:

- Login frequency
- Daily active users
- Monthly active users
- Course views
- Lesson completion
- Assignment submissions
- Quiz attempts
- Live class attendance
- Recording views
- Session duration

---

# 49. Teacher Activity Analytics

Track:

- Login frequency
- Classes conducted
- Live teaching hours
- Course content created
- Assignments created
- Quizzes created
- Assessments created
- Grades entered
- Student engagement

---

# 49.1 Vacation Classes

Vacation Classes are a **separate, paid module** run by the platform during school vacations (e.g. "October 2026 Vacation Classes", "Christmas Vacation Classes"). They are open to:

- Students already on the platform through their school, and
- Students who are **not yet onboarded** by any school.

## 49.1.1 Vacation Classes as a workspace

Vacation Classes run as their own tenant ("ClassProject Vacation Classes"), with each vacation period as an academic session. This gives vacation classes **every LMS feature** — courses, modules and content, live classes and recordings, assignments, quizzes and assessments, gradebook, attendance, forums, messages, calendar and analytics.

Students and teachers who also belong to a school get a **workspace switcher** in the sidebar:

```text
[ Ridgeview SHS ▾ ]  →  Ridgeview SHS
                         Vacation Classes
```

The switcher appears **only for someone who is currently in both**: a teacher with an active teacher record, or a student with an active student record, in their school and in Vacation Classes. Everyone else has one workspace and sees no switcher at all. Records left behind by a closed batch don't count: teachers released at close-out and withdrawn students no longer get it.

## 49.1.2 Landing page

A public landing page (no sign-in needed) at `/vacation` shows:

- The current vacation programme, dates and levels (e.g. JHS 3 BECE prep, SHS 1–3, WASSCE prep)
- Subject bundles with prices and savings
- Individual subjects with prices
- How it works, and FAQs
- **Register now**

## 49.1.3 Bundles and subjects

Students either:

- Choose a **bundle** — a set of subjects for one fee (e.g. "WASSCE Science Bundle: Core Maths, English, Integrated Science, Physics, Chemistry, Biology — GHS 900"), or
- **Select individual subjects**, each with its own fee (the total updates as they choose).

## 49.1.4 Registration and payment

```text
Landing page → Register
        ↓
Choose level/class
        ↓
Choose a bundle OR pick subjects (running total)
        ↓
Account — two clearly separate choices:
  ├── "I already have an account" → sign in; name, school (and its level) and class are picked up
  └── "I'm new here" → name, email, phone, current school level, current school, guardian, password
        ↓
Pay the fee (Mobile Money: MTN / Telecel / AirtelTigo, or card)
        ↓
Payment confirmed → registered and enrolled in the chosen subjects
        ↓
Receipt + "Go to Vacation Classes"
```

The account step shows the two paths as distinct, colour-coded cards ("I'm new here" and "I already have an account"); only the chosen path's form is shown.

New students give their **current school level** (required): **Basic School (Primary 1–6)**, **JHS** or **SHS**. They then pick their **current school** (optional) from a searchable list of the platform's schools at that level. **If the school is not listed, they contact support** (the platform support email is shown with a pre-filled "Please add my school" message) and can still finish registering. The level and school appear on the coordinator's registration list and export.

Existing students **must still pay**; their details are reused so they don't fill forms again. Registrations stay "Awaiting payment" until paid and only paid students are enrolled.

## 49.1.5 Vacation teachers and matching

- Vacation teachers can be new teachers, or existing teachers from any school linked into the vacation workspace.
- A **Teacher Matching** screen lists every subject × class with its enrolled students and assigned teacher, suggests teachers by specialisation and current load, supports manual assignment and **Auto-match**.

## 49.1.6 Vacation coordinator tools

- Overview: registrations, paid vs pending, revenue, enrolments per subject
- Bundles & pricing (subject fees, bundles, active/inactive)
- Registrations & payments (filter, export, mark cash payment, receipt)
- Teacher matching
- All standard school-admin tools (classes, subjects, courses, live classes, grades, attendance, analytics)
- Batches (Section 49.1.7)

## 49.1.7 Batches (cohorts)

Vacation Classes run **periodically, as batches** — one per school holiday (e.g. #1 Long Vacation Classes, #2 October Vacation Classes, #3 Christmas Vacation Classes). Each batch is one session of the vacation workspace, so its classes, subjects, prices, bundles, registrations, enrolments, courses, live classes, assessments, grades, attendance and payments all belong to that batch. The sidebar selector reads **Batch** instead of Academic session in the vacation workspace.

### Lifecycle

```text
Set up → Registration open → Running → Ended (needs closing) → Closed (records kept)
```

| State | When |
|---|---|
| Upcoming | Set up, registration not open yet |
| Registration open | Between the batch's registration open and close dates |
| Running | Between the batch start and end dates |
| Ended — needs closing | End date has passed; the Batches page shows a reminder |
| Closed | Closed out by the coordinator; read-only |

### Setting up the next batch

**Batches → Set up next batch** takes a name, class dates and registration window, and copies the structure of an earlier batch: **classes, subjects, subject prices and bundles** (each optional). Students, enrolments, teacher assignments and results are **never copied** — every batch starts with no students. Overlapping batch dates are rejected.

### Closing a batch — what happens to the data

Closing a batch **never deletes anything**. The close dialog first shows pre-checks (dates passed, submissions still ungraded, unpaid registrations, live classes still scheduled), then:

**Students**

- Registrations never paid are **cancelled** — those students never joined the batch. Paid registrations stay as the record of who completed it.
- Grades, attendance (with minutes in each live class), submissions, recordings and payments stay attached to the batch.
- Optionally each student is sent a **batch report** notification (results, attendance, minutes in live classes).
- Students keep access to the closed batch for a chosen period — **30, 60, 90 days or no limit** — to rewatch recordings and download their report. After that the batch no longer appears in their batch selector; staff always keep access.
- Optionally students are **invited to register for the next batch**. Returning students register with the **same account** (no new forms) and still pay for the new batch; their history across batches stays together and the next batch counts them as *returning*.

**Teachers**

- All teaching assignments end with the batch (the closed batch is read-only). Teachers keep their account and their teaching record for the batch.
- Optionally, teachers **not assigned to a later batch are deactivated**: their records and history stay, but they are left out of Teacher Matching until reactivated for another batch. Teachers already assigned to the next batch are untouched.
- Teachers linked in from partner schools keep their home-school account as normal.

**Batch**

- Scheduled live classes that never ran are cancelled.
- The batch is marked **Closed** with a close-out record: who closed it and when, students completed, unpaid registrations cancelled, teachers released/deactivated, whether reports were sent, the access end date and the batch students were invited to. The action is written to the audit log.

### Batch record

Every batch (open or closed) has a **Batch record** download — one Excel workbook with three sheets:

- **Students** — Student ID, name, index number, home school, class, subjects, amount paid, live attendance %, minutes in live classes, average score
- **Teachers** — staff ID, subjects taught, live classes scheduled and held, hours taught (used to pay vacation teachers)
- **Payments** — every registration with status, amount, reference, method and date

## 49.1.8 Guardian SMS alerts for live classes

Vacation students study from home, so their parents and guardians get a text message when a student misses a live class or leaves it early. The text goes to the guardian phone number on the registration: new students enter it when they register, and existing students keep the one from their school record.

| When | What the guardian receives |
|---|---|
| The student hasn't joined **10 minutes** after the teacher started the class | “ClassProject Vacation Classes: Ama has not joined today's Core Mathematics live class, which started at 5:00 PM. Please remind them to join.” |
| The student left and has been away **5 minutes**, while the class is still running | “ClassProject Vacation Classes: Ama left today's Core Mathematics live class at 5:24 PM, before it ends at 6:00 PM, and has not rejoined.” |

**Rules**

- **At most one text of each kind** per student per class, however long they stay away.
- **A short drop-out isn't texted.** If the student rejoins within the away time, nothing is sent.
- **Leaving at the very end isn't texted.** A text is sent only if the student left while more than the away time was still left in the class.
- **No texts during a break** (section 32), or for a student the teacher removed from the class.
- A student waiting in the waiting room counts as joined.

**Settings**

- Settings live in **Vacation Classes → Guardian Alerts**:
  - switch alerts on or off;
  - "not joined after" minutes (1–60, default 10);
  - "left and away for" minutes (1–30, default 5).
- The same page lists **every text sent**: when, student (with username), live class, why, number and message. It can be searched and filtered by kind.
- When texts go out during a class, the teacher sees a short notice ("SMS sent to 2 guardians · 2 not joined yet").

**In production**

- A server job sends the texts from the live video provider's join and leave events, so they go out even if the teacher's device loses its connection.
- Texts go through the SMS provider under the school's sender ID. Delivery status is recorded in the SMS log.
- The prototype runs the check from the teacher's classroom every 20 seconds, and keeps the texts in an outbox.

---

# 49.2 ClassProject Open Recommendations (Explore Beyond Class)

**ClassProject Open** (working name) is a separate, global MOOC platform, specified in its own repository, **cpopen** ([start here](https://github.com/Techmawu-Solutions/cpopen)). It has its own users, database and roadmap. The **only** link between the two platforms is this one: **ClassProject recommends Open courses to students, matched to their subjects.**

### What students see

- **Dashboard:** a card, *"Go further with ClassProject Open"*, with three courses matched to the student's subjects, and **Explore all**.
- **Explore Beyond Class** (student menu), which shows every recommendation. The student can:
  - filter them by subject;
  - **hide** any of their own subjects they don't want suggestions for;
  - **add interests**: subjects they don't take but are curious about (for example, a General Arts student interested in ICT).
- **Every course says why** it was recommended:
  - "Matches Elective Mathematics: quadratic functions";
  - "WASSCE prep for Core Mathematics": only in SHS 2–3 (BECE prep: JHS 2–3);
  - "Goes beyond the ICT syllabus: programming";
  - "Because you're interested in French".
- Each course shows its provider, hours, whether it's free, whether it works offline (with the download size), and its exam alignment. **Opening one** shows a preview (summary, outline, level, time, cost, offline) and a button, **Open on ClassProject Open**, which opens the course there in a new tab.

### How courses are matched

- A course matches through the student's **subjects**, as catalogue codes (Section 17.1): `ENG`, `MATH`, `EMATH`, `ICT`…
- It must suit the student's **level**, taken from their class (`SHS 1` → `SHS1`). A course pitched mostly below the student's level ranks lower.
- **Ranking order:** own subjects, then interests, then exam years, then free courses.
- **Diversity:** at most two courses per subject among the first six.

### Privacy

- ClassProject sends Open **only subject codes and a level**, never the student's name, school, ID or grades. The link to the course carries only `ref=classproject`, the subject and the level.
- Learning on Open **doesn't count towards school grades**, and nothing comes back to ClassProject. The preview says both.
- If the student signs up on Open, Open's under-18 rules apply: guardian consent, and a private account.

### Controls

**Super Admin → Settings → ClassProject Open recommendations** switches the feature on or off for every school. It is on by default.

### Prototype vs production

- **Prototype:** the prototype has a built-in list of about 30 secondary-friendly Open courses (`lib/mooc.ts`) and applies Open's matching rules. **In development, the links open the ClassProject Open prototype** (the cpopen repository's `prototype/`, on http://localhost:3001), which lands on the course page with the ClassProject referral welcome. `NEXT_PUBLIC_MOOC_URL` points them at a hosted copy instead.
- **No dead links:** a deployment without `NEXT_PUBLIC_MOOC_URL` has no Open site to send students to. The preview still opens inside ClassProject, and its button reads "ClassProject Open coming soon" instead of linking to an address that doesn't exist.
- **Watch inside ClassProject:** a course with an introduction video (a public YouTube video) plays it in the preview, so the student sees what the course is like without leaving.
- **Embedded video players** (YouTube, Vimeo) receive the page's origin as referrer. YouTube refuses to play embeds without it (its "error 153"), which also affects video lessons in courses and the class library.
- **Production:** ClassProject calls Open's signed partner API: `GET /v1/partner/recommendations?subjects=EMATH,ICT&level=SHS2&country=GH`, signed with HMAC (Open spec section 25). `country` is the school's country, because catalogue codes are unique only within a country (section 17.1). It caches each answer for 24 hours per country, subject, level and language. If Open can't be reached, it shows the last cached list or hides the card; the dashboard never waits on it.

**Any change to this link updates both specifications:** this section, and Open spec section 25.

---

# 50. Audit Logs

The platform should maintain an audit trail.

Examples:

```text
Admin created school
Teacher added
Student imported
Role created
Permission modified
Assessment created
Grade updated
Grade exported
Live class started
Live class ended
Recording created
```

---

# 50.1 Navigation Shell

All portals share the same shell:

- **Collapsible side navigation** — a collapse/expand button toggles the sidebar between the full width (icons + labels) and a compact icon-only rail; icon-only items show their label as a tooltip. The user's choice is remembered.
- **Mobile navigation** — below tablet width the sidebar is hidden and opens as a slide-over drawer from a menu button.
- **Top bar** — academic session selector, notification icon, message icon, user menu.
- **A–Z order:** menu items and their sub-items are sorted alphabetically in every portal. Dashboard stays first as the home page. The order follows the language on screen, so a French menu is A–Z in French.

# 50.2 Interface Language

Every page can be shown in **English, French, Portuguese or Spanish**. English is the source language.

**Where to change it:** a language button (a translate icon plus the language code, e.g. `FR`) sits in every header: the app header next to messages and notifications, the sign-in pages, the learning area, the live classroom and the public Vacation Classes site. The menu lists each language in its own name (English, Français, Português, Español) so anyone can find theirs. The change applies at once, without reloading, and sets the page's `lang` attribute for screen readers.

**What is translated:** everything the platform itself writes:
- menus, buttons, headings, labels, hints, placeholders, tooltips and screen-reader labels;
- messages, confirmations, empty states and errors;
- status and role names;
- dates, weekdays, months and relative times ("il y a 2 heures", "hace 3 días").

**What is not translated:** what people write stays exactly as written. That covers:
- school, class, subject and course names;
- lesson and assessment titles;
- people's names;
- chat, forum and message text;
- uploaded documents;
- guardian SMS and email text.

The SMS log shows the text that was actually sent. Brand names (ClassProject, ClassProject Open, WAEC, GES EMIS, BECE, WASSCE) are never translated.

**Where the choice is kept:** in the prototype, per browser (`localStorage`). In production it is also saved on the account (`users.locale`), so it follows the person to every device.

**How it works in the prototype:**
- Dictionaries live in `lib/i18n/dict/{fr,pt,es}.json`, keyed by the English text.
- Sentences built from values (for example "Messages ({0} unread)") are stored as patterns with numbered slots. Each slot's value is translated too when it is a known phrase or a date.
- A runtime translator (`lib/i18n/dom-translator.ts`) swaps the rendered English after each render and restores it when English is chosen again. Components therefore stay written in plain English.
- Anything marked `data-no-translate` is left alone.

**Keeping it complete:** `node scripts/i18n-extract.mjs . --missing` lists interface strings without a translation. Every new or changed English string needs French, Portuguese and Spanish entries in the three dictionaries.

**Production:** move to message catalogues (ICU MessageFormat, for example `next-intl`), keeping the same keys and plural rules. Translators review the catalogues, and school-specific wording (such as "Semester" or "Term") comes from the school's settings.

# 51. Main Navigation — Super Admin

```text
Dashboard

Schools
├── All Schools
├── Add School
├── Import Schools
└── School Administrators

Users
├── Students
├── Teachers
├── Administrators
└── All Users

Academic
├── Academic Sessions
├── Programmes
├── Classes
├── Subjects
├── Programme & Subject Catalogue
└── Catalogue Requests

Vacation Classes
├── Overview
├── Bundles & Pricing
├── Registrations & Payments
├── Teacher Matching
└── Landing Page

Content
├── Courses
├── Resources
├── Content Library
└── Learning Materials (class library by subject and level)

Live Classroom
├── Live Sessions
├── Recordings
└── Attendance

Assessments
├── Assessments
├── Results
└── Reports

Analytics
├── National
├── Regions
├── Districts
└── Schools

Access Control
├── Roles
├── Permissions
└── Role Assignments

System
├── Notifications
├── Audit Logs
└── Settings
```

---

# 52. Main Navigation — School Administrator

```text
Dashboard

Academic
├── Academic Sessions
├── Programmes
├── Classes
└── Subjects

Students
├── All Students
├── Import Students
└── Enrolments

Teachers

Courses

Live Classes

Assessments

Grades

Attendance

Forums

Messages

Analytics

School Settings
```

---

# 53. Main Navigation — Teacher

```text
Dashboard

My Classes

My Subjects

Content

Live Classes

Assignments

Quizzes

Assessments

Grades

Students

Forums

Messages

Analytics
```

---

# 54. Main Navigation — Student

```text
Dashboard

My Classes

My Subjects

Learning

Live Classes

Assignments

Quizzes

Grades

Forums

Messages

Calendar

Notifications
```

---

# 55. Frontend Technology Stack

Recommended:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
TanStack Query
Zustand
React Hook Form
Zod
Recharts
```

Deployment:

```text
Vercel
```

---

# 56. Frontend Architecture

```text
app/
│
├── (auth)/
│   ├── login/
│   ├── forgot-password/
│   └── reset-password/
│
├── super-admin/
│   ├── dashboard/
│   ├── schools/
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   ├── analytics/
│   └── settings/
│
├── school/
│   ├── dashboard/
│   ├── academic-sessions/
│   ├── students/
│   ├── teachers/
│   ├── programmes/
│   ├── classes/
│   ├── subjects/
│   ├── live-classes/
│   ├── assessments/
│   ├── grades/
│   └── analytics/
│
├── teacher/
│   ├── dashboard/
│   ├── classes/
│   ├── subjects/
│   ├── content/
│   ├── live/
│   ├── assessments/
│   └── grades/
│
└── student/
    ├── dashboard/
    ├── classes/
    ├── subjects/
    ├── learning/
    ├── live/
    ├── assignments/
    └── grades/
```

---

# 57. Reusable Components

```text
components/
│
├── dashboard/
│   ├── StatCard
│   ├── ActivityChart
│   ├── RecentActivity
│   └── UsageChart
│
├── tables/
│   ├── DataTable
│   ├── Filters
│   ├── Search
│   └── ExportButton
│
├── classroom/
│   ├── VideoStage
│   ├── ParticipantGrid
│   ├── ChatPanel
│   ├── ClassroomToolbar
│   ├── PollPanel
│   ├── Whiteboard
│   └── ParticipantPanel
│
├── course/
│   ├── CourseHeader
│   ├── ModuleList
│   ├── LessonViewer
│   ├── ResourceViewer
│   └── ProgressBar
│
├── assessment/
│   ├── AssessmentBuilder
│   ├── QuestionEditor
│   ├── Gradebook
│   └── ResultChart
│
├── communication/
│   ├── NotificationBell
│   ├── MessageBell
│   ├── ConversationList
│   ├── MessageThread
│   ├── ForumList
│   ├── ForumThread
│   └── PostComposer
│
├── media/
│   ├── VideoPlayer (with picture-in-picture)
│   └── PipButton
│
├── academic/
│   ├── ActiveSessionBadge (sidebar) + SessionListPage
│   ├── AcademicSessionForm
│   ├── ProgrammeForm
│   ├── ClassForm
│   └── SubjectForm
│
└── forms/
    ├── StudentForm
    ├── TeacherForm
    ├── SchoolForm
    └── UserForm
```

---

# 58. Core Data Entities

The frontend mock data should be designed around real entities.

```text
School
User
Role
Permission
AcademicYear
AcademicSession
Programme
Class
Subject
Student
Teacher
Enrollment
Course
Module
Lesson
Assignment
Quiz
Question
Assessment
Grade
LiveSession
Recording
FlipChart
Attendance
AttendanceSegment
LearningOutcome
LearningIndicator
ScormPackage
ScormAttempt
LessonProgress
LibraryTopic
LibraryMaterial
StudentSubjectInterest
Announcement
SchoolEvent
Notification
EmailMessage
Conversation
Message
Forum
ForumThread
ForumPost
CatalogueProgramme
CatalogueSubject
CatalogueRequest
VacationBundle
VacationPrice
VacationRegistration
Payment
AuditLog
```

## 58.1 Database schema

The database behind the platform is defined in **`database/schema.sql`** (MySQL 8 / MariaDB). **`database/README.md`** explains it, with a relationship diagram and a map from the prototype's data to the tables.

- **One shared database; each school is a tenant.** Every record a school owns carries its school, and every academic record carries its academic session, so a school only ever sees its own data and academic years never mix (Section 3, section 7, section 60).
- **Sign-in names are unique where they need to be:**
  - platform usernames and emails across the platform;
  - student school usernames across the platform;
  - staff IDs within a school;
  - WAEC and GES EMIS codes across schools (Section 10.1).
- **Ready for more than one country.** Ghana is the first country, but nothing is tied to it:
  - each school has a country, and its own time zone, currency and language;
  - its official codes (the WAEC code and the GES EMIS code in Ghana) are kept as a list of codes, each of a kind that says whether school administrators sign in with it and whether it starts student usernames — so another country's codes work the same way;
  - prices and payments are kept in whole pesewas (or the smallest unit of the school's currency), with the currency beside them.
  - the programme and subject catalogue is kept **per country** (`catalogue_programmes.country_id`, `catalogue_subjects.country_id`), with codes unique within a country (section 17.1).
- **Documents are one content type.** A course item or library material that is an uploaded file is a `document`; its kind (PDF, slides, Word, spreadsheet, image) is read from the file, not stored as a separate type (section 26).
- **Staff-only data stays separate.** Learning outcomes and indicators (Section 25.2) are kept apart from lesson content, so they're never sent to students.
- **SCORM results are kept in full.** Each learner's SCORM run-time data is stored exactly as the package set it (Section 26.2); the best score is also the gradebook entry.
- **Interactive video questions are kept apart from the video** (section 26.3):
  - a video asset can be reused across a school's courses;
  - each lesson has versioned sets of timestamped questions with their options;
  - each answer is kept as an attempt scored by the platform, with the options chosen;
  - each student has progress per version: place in the video, the parts watched, and a summary of counts and score;
  - learning events record answers, skips and completions for later mastery tracking;
  - suggested questions are kept as pending until a teacher decides.
- **Leaving and rejoining keeps every stretch.** Each stretch a student spends in a live class is its own attendance row (Section 40).
- **The class library is stored once, not per school.** Topics and materials are kept by catalogue subject and level (section 25.3), and courses find them through their subject and class level. Students' completion of library materials is kept separately from course items.
- **Every SMS is logged.** The SMS outbox keeps each guardian alert (section 49.1.8), at most one per student, live class and kind.
- **Every year keeps its own class places.** Promotion (section 22.4) adds class places and registrations in the new year's session and never changes the old one. Each promotion is kept with one row per student: their outcome, their new class, and what undo restores (`promotion_runs`, `promotion_outcomes`). A school's class levels are kept in order (`school_levels`), and how it progresses on the school (`schools.progression_model`). Graduation is kept on the student: date, cohort and how long alumni access lasts.
- **Parents are linked, not copied.** A parent is an account with the Parent / Guardian role, linked to each child in `guardian_links`. Whether a school offers parent access is kept on the school (`parent_access`, section 22.3).
- **Each person's interface language is kept on their account** (`users.locale`: English, French, Portuguese or Spanish; section 50.2), so it follows them to every device.
- **Recommendations from ClassProject Open are not stored.** ClassProject stores only each student's extra interests and hidden subjects (Section 49.2). The courses come from Open's partner API.
- **Not stored in the database:**
  - the teacher's camera background, which stays on their device;
  - the live room's moment-to-moment state, which travels through the live video provider.

**The schema is kept up to date with this specification.** Any change that adds, changes or removes information the platform keeps also updates `database/schema.sql` and its README.

---

# 59. Important Entity Relationships

```text
School
│
├── Academic Years
│     │
│     └── Academic Sessions
│
├── Programmes
│     │
│     └── Classes
│            │
│            ├── Students
│            │
│            └── Subjects
│                   │
│                   └── Teachers
│
└── Users
```

LMS:

```text
Subject
│
└── Course
    │
    ├── Modules
    │   ├── Lessons
    │   ├── Files
    │   ├── Assignments
    │   └── Quizzes
    │
    ├── Assessments
    │
    └── Live Sessions
            │
            └── Recordings
```

---

# 60. Academic Session Relationship

Every academic transaction should be associated with an academic session where appropriate.

```text
School
  ↓
Academic Year
  ↓
Academic Session
  ↓
Programme
  ↓
Class
  ↓
Subject
  ↓
Enrollment
  ↓
Student
```

Assessments, grades, attendance and reports should retain their academic-session context.

---

# 61. School Onboarding Workflow

```text
Super Admin
     ↓
Create School
     ↓
Select Category (Basic / JHS / SHS …) and Type (Public / Private)
     ↓
Enter WAEC / GES EMIS Code
     ↓
Select Region
     ↓
Select District
     ↓
Create School Administrator
     ↓
Configure Academic Year
     ↓
Configure Academic Session
     ↓
Activate School
```

---

# 62. School Setup Workflow

After activation:

```text
Complete School Profile (if any detail is missing)
        ↓
Create Academic Year
        ↓
Create Academic Session
        ↓
Select Programmes (from catalogue, or request)
        ↓
Create Classes
        ↓
Select Subjects (from catalogue, or request)
        ↓
Create Teachers
        ↓
Import Students
        ↓
Assign Students to Classes
        ↓
Assign Teachers to Subjects
        ↓
Register Students for Subjects
        ↓
Begin Teaching
```

---

# 63. MVP Development Phases

## Phase 1 — Design System

- Authentication
- Sidebar (collapsible / expandable)
- Top navigation (notification and message icons)
- Cards
- Tables
- Forms
- Modals
- Charts
- Responsive layout
- Dark/light mode

## Phase 2 — Super Admin

- Dashboard
- Schools
- Create School
- School Details
- Administrators
- Users
- Roles
- Permissions
- National Analytics

## Phase 3 — School Administration

- School Dashboard
- Academic Years
- Academic Sessions
- Students
- Student Import
- Teachers
- Programmes
- Classes
- Subjects
- Enrolments
- School Analytics

## Phase 4 — LMS

- Teacher Dashboard
- Subjects
- Modules
- Lessons
- Files
- Assignments
- Quizzes
- Assessments
- Gradebook

## Phase 5 — Student Experience

- Student Dashboard
- My Classes
- My Subjects
- Course Workspace
- Lesson Viewer
- Assignments
- Quizzes
- Grades
- Progress

## Phase 6 — Virtual Classroom

- Pre-class Lobby
- Live Classroom
- Video interface
- Chat
- Participants
- Screen sharing interface
- Polls
- Reactions
- Raise hand
- Attendance
- End Class
- Recording processing
- Recording library

## Phase 7 — Analytics

- School Analytics
- District Analytics
- Regional Analytics
- National Analytics
- Student Engagement
- Teacher Activity
- Course Activity
- Live Class Usage

---

# 64. Recommended MVP Screens

## Authentication

1. Login (email, username, staff ID or school code — spec section 10.1)
2. Forgot Password
3. Reset Password

## Super Admin

4. Super Admin Dashboard
5. Schools
6. Create School
7. School Details
8. School Administrator
9. Users
10. Roles
11. Permissions
12. National Analytics

## School Admin

13. School Dashboard
14. Academic Years
15. Academic Sessions
16. Students
17. Import Students
18. Teachers
19. Programmes
20. Classes
21. Subjects
22. Subject Enrolment
23. School Analytics

## Teacher

24. Teacher Dashboard
25. My Classes
26. Subject Workspace
27. Content Builder
28. Module Builder
29. Assignment Builder
30. Quiz Builder
31. Assessment Builder
32. Gradebook
33. Teacher Analytics

## Student

34. Student Dashboard
35. My Classes
36. Course Workspace
37. Lesson Viewer
38. Assignment
39. Quiz
40. Grades

## Virtual Classroom

41. Pre-Class Lobby
42. Live Classroom
43. Chat
44. Participants
45. Poll
46. Whiteboard
47. End Class
48. Recording
49. Recording Library

## System

50. Notifications
51. Calendar
52. Profile
53. Settings
54. Audit Logs

## Messaging & Forums

55. Messages
56. Forums (per class & subject)
57. Forum Thread

## Catalogue & Onboarding

58. Programme & Subject Catalogue (Super Admin)
59. Catalogue Requests (Super Admin review / School submit)
60. Complete School Profile prompt (School Admin)

## Vacation Classes

61. Vacation landing page (public)
62. Vacation registration & payment
63. Vacation overview (coordinator)
64. Bundles & pricing
65. Registrations & payments
66. Teacher matching

---

# 65. Vercel Free-Tier Prototype Strategy

The Vercel deployment should initially be a **frontend prototype**.

Use mock/local data for:

```text
Schools
Users
Students
Teachers
Classes
Subjects
Academic Sessions
Courses
Assessments
Grades
Live Sessions
Analytics
```

The frontend should simulate realistic workflows without requiring a production backend.

For example:

```text
Create School
     ↓
Frontend state updates
     ↓
School appears in table
     ↓
Open School
     ↓
Create Academic Session
     ↓
Session appears in selector
```

This allows the entire product experience to be demonstrated before the backend is connected.

---

# 66. Future Production Architecture

The backend is being built in the separate **cpback** repository. Its `BACKEND_PLAN.md` holds the full architecture, the decisions taken, the delivery phases and the open questions; its section 0.1 says where the work stands. Decisions so far (1 October 2026):

- **No link to the TechMawu console (tconsole).** The Super Administrator runs the platform, billing included.
- **Live video uses LiveKit.** Whether it is LiveKit's hosted service or self-hosted is still open.
- **Closed academic sessions are read-only for everyone** (Section 6.5).

When moving from prototype to production, the architecture can become:

```text
Next.js / React
       │
       │ API
       ▼
Laravel Backend
       │
       ├── Authentication
       ├── RBAC
       ├── Multi-Tenancy
       ├── Academic Management
       ├── LMS
       ├── Assessments
       ├── Analytics
       └── Notifications
       │
       ▼
MySQL
```

External services:

```text
Video Infrastructure
       │
       └── LiveKit

Object Storage
       │
       └── S3-Compatible Storage

Email / SMS
       │
       └── Provider

Payments
       │
       └── Payment Provider
```

---

# 67. Video Infrastructure Consideration

The Vercel frontend should not be responsible for processing or permanently storing video recordings.

The eventual production flow should be:

```text
Teacher
   ↓
Video Provider
   ↓
Live Session
   ↓
Recording
   ↓
Video Storage
   ↓
Recording URL
   ↓
Laravel
   ↓
Database
   ↓
Next.js Frontend
```

The frontend only needs to display:

```text
Recording Processing
Recording Ready
Watch Recording
Download Recording
```

---

# 68. Future Features

The architecture should leave room for:

- Parent portal
- Mobile applications
- AI lesson planning
- AI tutoring
- AI assessment generation
- AI student analytics
- Recommendation engine
- SCORM
- H5P
- Digital certificates
- Payment management
- School subscriptions
- SMS notifications
- Email notifications
- Push notifications
- Library management
- Timetable
- Payroll
- Finance
- Inventory
- School POS integration
- National education reporting
- API integrations

---

# 69. Product Design Principles

The frontend should follow these principles:

### 1. Simple

Users should understand the interface without extensive training.

### 2. Role-specific

Users should only see features relevant to their role.

### 3. Academic-session aware

Academic data should always be associated with the correct academic year and semester/term.

### 4. Mobile responsive

The **entire platform** — every portal (Super Admin, School Admin, Teacher, Student), every screen, the live classroom and the video players — must be fully usable on phones and tablets, not only on desktop:

- Layouts reflow to a single column on small screens
- The sidebar becomes a slide-over drawer on mobile and can be collapsed to an icon rail on desktop
- Tables scroll horizontally rather than overflowing the page
- Touch targets are large enough to tap comfortably
- The live classroom stacks video, chat and participants on mobile

### 5. Data-driven

Dashboards should provide useful information rather than simply displaying decorative charts.

### 6. Scalable

The frontend should be designed for thousands of schools and potentially millions of students.

### 7. Ghana-ready

The platform should support:

- WAEC codes
- GES EMIS codes
- SCORM 1.2 and SCORM 2004 content, import and export (Section 26.2)
- School categories (Basic, JHS, SHS, TVET…) and public/private types
- Ghana regions
- Districts
- School structures
- Academic years
- Semesters/terms

while remaining flexible enough for other African education systems.

---

# 70. Final Product Flow

The complete platform experience should ultimately look like:

```text
                    SUPER ADMIN
                         │
                         ▼
                     SCHOOLS
                         │
                         ▼
                 SCHOOL ADMINISTRATOR
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
      ACADEMIC       USERS         SETTINGS
       STRUCTURE
            │
            ▼
      ACADEMIC YEAR
            │
            ▼
      ACADEMIC SESSION
      (Semester / Term)
            │
            ▼
        PROGRAMME
            │
            ▼
          CLASS
            │
       ┌────┴────┐
       ▼         ▼
    STUDENTS   SUBJECTS
                  │
                  ▼
               TEACHER
                  │
                  ▼
               COURSE
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
       MODULE   CONTENT  LIVE CLASS
          │                │
          ▼                ▼
     ASSIGNMENT         RECORDING
       QUIZ
     ASSESSMENT
          │
          ▼
        GRADES
          │
          ▼
      ANALYTICS
          │
    ┌─────┼──────┐
    ▼     ▼      ▼
 SCHOOL DISTRICT REGION
          │
          ▼
       NATIONAL
```

---

# 71. Initial Prototype Goal

The first Vercel deployment should demonstrate the complete journey:

> **Super Admin creates a school → assigns a school administrator → school administrator creates an academic year and semester → creates programmes → creates classes → creates subjects → assigns teachers → imports students → registers students for subjects → teacher creates course modules → teacher uploads learning content → schedules a live class → students join the live classroom → class ends and recording becomes available → teacher creates assessments → students submit/take assessments → teacher grades students → grades are exported → administrators view school analytics → Super Admin views district, regional and national platform usage.**

This should be the **golden end-to-end workflow** that guides the frontend development.

---

# 72. Initial Prototype Scope

For the first version, prioritize:

```text
✓ Multi-tenant UI
✓ Super Admin
✓ School Admin
✓ Teacher
✓ Student
✓ Roles & Permissions
✓ School Management
✓ Bulk School Upload (codes, region, district optional)
✓ School Profile Completion Prompt
✓ Programme & Subject Catalogue + Requests
✓ Vacation Classes (landing page, bundles, subject selection, payment, teacher matching)
✓ Academic Year
✓ Academic Session
✓ Semester / Term
✓ Programme Management
✓ Class Management
✓ Subject Management
✓ Student Management
✓ Teacher Management
✓ Student Import UI
✓ LMS
✓ Modules
✓ Course Content
✓ Assignments
✓ Quizzes
✓ Assessments
✓ Gradebook
✓ Live Classroom UI
✓ Picture-in-Picture (live class & video playback)
✓ Live Chat
✓ Participants
✓ Screen Sharing UI
✓ Polls
✓ Attendance
✓ Recording UI
✓ School Analytics
✓ District Analytics
✓ Regional Analytics
✓ National Analytics
✓ Notifications (header icon)
✓ Messages (header icon)
✓ Class & Subject Forums
✓ Collapsible Sidebar
✓ Mobile Responsive (all portals)
✓ Calendar
✓ Audit Logs
```

The result should feel like a **real production education platform**, even though the initial deployment is a frontend-only prototype on Vercel.

---

# 73. Change Log

The prototype and this specification are updated together; each change to the product is recorded here.

| Date | Change | Spec |
|---|---|---|
| Sep 2026 | Mobile-responsive pages for every role | 69 |
| Sep 2026 | Recordings as thumbnails; LIVE indicators on subjects and sidebar; live-class alerts in app, on device and by email | 34.1, 30.2, 41 |
| Sep 2026 | Session and school switchers moved to the sidebar; quizzes grouped under Assessments | 6.5, 35 |
| Sep 2026 | New question types (multiple select, numeric, ordering, drag words, drag matching) and question import from CSV/Excel | 36.1, 37.1 |
| Sep 2026 | School branding (logo and colours); watch-only recordings and document download settings | 5.3 |
| Sep 2026 | Moodle-style sections with publish / draft / schedule; focused learning area; in-platform document viewer | 25, 30.1, 27.1 |
| Sep 2026 | Question and option shuffling; LaTeX and images in questions and options | 36.1 |
| Sep 2026 | Live class accountability reports (teacher delivery, student attendance by week/month/term/year, class report) | 40.1 |
| Sep 2026 | Student ID and 12-digit index number; numeric-only fields; vacation batches with close-out | sections 22.1–22.2, section 49.1.7 |
| Sep 2026 | Student ID format SCHOOLCODE-NNNN-YY; import header variants; live-class view modes; members panel on phones | 22.1, 23, 32 |
| Sep 2026 | Host controls: mute one/all (with "mute me too"), video and unmute permissions, remove until let back in | section 32 Classroom Management |
| Sep 2026 | Teacher's stage (whiteboard, presentation, screen share) shared live with students; whiteboard pages saved to the course | 32 |
| Sep 2026 | Pause for a break, end and continue later (Part 2); breakout rooms | 32 |
| Sep 2026 | Whiteboard: ask one student to answer, shapes, text, graph plotter | 32 |
| Sep 2026 | Whiteboard: LaTeX equations and formulas (maths, physics, chemistry) | 32 |
| Sep 2026 | All files (lessons, submissions, attachments) open in the in-app viewer; new tab / download are optional | 27.1 |
| Sep 2026 | School category (Basic / JHS / SHS / TVET…) and public/private type; bulk upload per category and type; "GES EMIS code" naming | 5, 5.1 |
| Sep 2026 | Vacation registration: distinct "I'm new" / "I have an account" paths; current school level and school picker, with "contact support" when a school isn't listed | 49.1.4 |
| Sep 2026 | Platform username for every user (integration key), WAEC-prefixed school usernames for students, staff ID for teachers; sign in with any of them | 10.1 |
| Sep 2026 | Screen sharing carries the shared screen's sound (video playback), with a "Sharing sound" meter and browser guidance | 32.1 |
| Sep 2026 | Submitted assignment files are kept with the submission and open for the teacher when grading | 27.1 |
| Sep 2026 | School administrators sign in only with the school's WAEC or GES EMIS code (email until the school has one) | 10.1 |
| Sep 2026 | Schedule live class: description, start and end times with length shortcuts, wider dialog | 33.1 |
| Sep 2026 | Student usernames include the admission year (WAECCODE-NNNN-YY) and match the Student ID; usernames shown under student names everywhere | 10.1 |
| Sep 2026 | Live class reactions shown in a small corner tray grouped by emoji, instead of floating over the lesson | 32 |
| Sep 2026 | SCORM conformance: import and play SCORM 1.2 / 2004 packages with the full run-time API, learner results, and course export as SCORM | 26.2 |
| Sep 2026 | SCORM: scores count in the gradebook (best score), quizzes export as self-marking SCOs with interactions, SCORM 2004 navigation requests | 26.2 |
| Sep 2026 | SCORM export restricted to the Super Administrator (`scorm.export` permission); export from Content → Courses | 10, 26.2 |
| Sep 2026 | Sidebar shows only the active session; sessions are set and switched on the Academic Sessions page (teachers and students get a view-only page) | 6.5 |
| Sep 2026 | Whiteboard as a flip chart: page thumbnails, new / duplicate / move / delete pages, pin a page for students and write on other pages privately until shown | 32 |
| Sep 2026 | Screen sharing on phones: clear explanation and alternatives (mobile browsers don't allow it) | 32.1 |
| Sep 2026 | Save flip charts for reuse: save / save changes / save as new, open a saved flip chart (added privately or replacing the board), add pages to the course any time, download as PDF, save when ending class; Flip charts library for teachers | 32 |
| Sep 2026 | Annotate PDFs and pictures on the whiteboard: upload or pick a course PDF, choose pages, split portrait pages into halves, private until shown; highlighter; eraser never removes the document; annotated pages saved, added to the course and exported | 32 |
| Sep 2026 | Presenting fixes: the Whiteboard button only shows/hides the board (easel icon, "Board & PDFs" / "Hide board"); Pointer and Laser pointer tools; PDFs open with the pointer; tapping the pen again stops drawing without closing the presentation; hiding the board returns to the presentation or screen share | 32 |
| Sep 2026 | Class recordings are watch-only for teachers unless an administrator allows downloading — for all teachers (Settings → Content protection) or per teacher (teacher profile); new "Download class recordings" permission | 5.3, 34.2, 10 |
| Sep 2026 | Permissions enforced everywhere: removing a permission hides the page from the menu, blocks it by address, and removes the matching buttons — for teachers and students too (they previously bypassed checks); role changes and disabled accounts take effect in already-open sessions without reloading | 9.1 |
| Sep 2026 | Phones and tablets detected by device (not just the browser API), explanation shown as a dialog with Present / Whiteboard shortcuts; clearer errors on computers | 32.1 |
| Sep 2026 | Live class lists: status follows the clock (Due now / Not held) and the teacher can start a due class from the list | 33.1 |
| Sep 2026 | Present: pick a course lesson, course document or PDF/picture from the computer; presented on the board with pen, highlighter, laser pointer and zoom for everyone | 32.2 |
| Sep 2026 | Classroom full screen covers the whole page, so Pause, PDF, Flip chart, "Who can draw" and breakout menus work in full screen | 32.2 |
| Sep 2026 | Brought the presenting, recordings and permissions changes up to date with the latest main: the teacher and student Academic Sessions pages now need `academic_sessions.view`; the Present picker, laser pointer and zoom work with the Pointer/Pen toggle | 9.1, 32.2 |
| Sep 2026 | Learning outcomes and learning indicators per lesson (staff only, never shown to students); School Admin and Super Admin report on which teachers have written them | 25.2 |
| Sep 2026 | Live attendance keeps every stretch when a student leaves and rejoins (first join, last leave, time in the room, lateness on first join) | 40 |
| Sep 2026 | Classes end by themselves at their planned end; students stay in class if the teacher's connection drops; only the subject teacher is ever host | 33.1 |
| Sep 2026 | One session per person: joining from another device or browser warns first, then closes the older session | 33.1 |
| Sep 2026 | Teacher camera background in live classes: blur, preset pictures or their own picture, from the class toolbar or the lobby | 32 |
| Sep 2026 | Database schema: `database/schema.sql` and `database/README.md` (one shared database, school and session on every record, sign-in uniqueness, SCORM, attendance stretches, Vacation Classes payments) | 58, 58.1 |
| Sep 2026 | SCORM packages are added by the Super Administrator only (`scorm.upload`), from Content → Courses → Add SCORM; teachers no longer see SCORM when adding content | 10, 26, 26.2 |
| Sep 2026 | ClassProject Open recommendations: dashboard card and Explore Beyond Class page with subject-matched courses from the separate MOOC platform, reasons, interests and hidden subjects, and a Super Admin switch; only subject codes and level are shared | 49.2, 58, 58.1 |
| Sep 2026 | ClassProject Open (the MOOC platform) specified separately in `mooc/`, with its own database schema; this spec links to it | 49.2 |
| Sep 2026 | ClassProject Open recommendation links open the Open prototype in development (`NEXT_PUBLIC_MOOC_URL` for hosted copies) | 49.2 |
| Sep 2026 | Vacation Classes: guardian SMS alerts when a student hasn't joined a live class in time or leaves early, with settings and a log in Vacation Classes → Guardian Alerts | 49.1.8, 58.1 |
| Sep 2026 | Class library: the Super Administrator publishes learning materials by subject and level (Content → Learning Materials); every class at that level taking the subject sees them in its course after the teacher's sections, counting towards progress | 25.3, 10, 51, 58, 58.1 |
| Sep 2026 | Teachers and students no longer get the Academic Sessions page by default: the menu entry, the sidebar badge's link and the page all need `academic_sessions.view`, which administrators grant per role | 6.5, 10 |
| Sep 2026 | Interface language switch (English, French, Portuguese, Spanish) in every header; everything the platform writes is translated, user content is not; choice kept per browser and on the account in production (`users.locale`) | 50.2, 58.1 |
| Sep 2026 | Parents and guardians: a Parent portal to follow each child's progress, grades, work and live-class attendance; parent access switched on per school by the Super Administrator at onboarding (default on for Basic and JHS); school administrators link parents to students. The workspace switcher shows only for people who teach or study in both their school and Vacation Classes | 22.3, 49.1.1, 58.1 |
| Oct 2026 | Closed academic sessions are read-only for everyone, administrators included: no grading, attendance corrections or edits; students can look back but nothing is recorded; closed forums are read-only; a closed session can't be reopened (Set active only for upcoming sessions); a running class still finishes with its attendance and recording | 6.5 |
| Oct 2026 | Database ready for more than one country: countries with their own region and district names; each school has a country, time zone, currency and language; WAEC and GES EMIS codes kept as typed school codes (sign-in and username rules unchanged); money in whole minor units with its currency | 58.1 |
| Oct 2026 | Production backend: built in the cpback repository (see its `BACKEND_PLAN.md`); no tconsole link; LiveKit chosen for live video | 66 |
| Oct 2026 | ClassProject Open moved to its own repository, **cpopen** (it was in `mooc/`). The recommendation link is unchanged | 49.2 |
| Oct 2026 | Super Administrator imports from CSV or Excel (Import Data), country first: students and teachers into a school of that country, programmes and subjects into that country's catalogue | 23.1 |
| Oct 2026 | One programme and subject catalogue per country; schools choose only from their own country's, and codes are unique within a country | 17.1, 58.1 |
| Oct 2026 | Countries: Global and Country analytics above national; regions and districts named per country (State / LGA in Nigeria); country on the Add School wizard, school form and school import; Countries card and students-by-country chart on the dashboard; demo countries Nigeria and Côte d'Ivoire | 4, 4.1, 12, 43.1, 44, 58.1 |
| Oct 2026 | Side menus sorted A–Z in every portal, in the language on screen (Dashboard first) | 50.1 |
| Oct 2026 | Login and password pages fit phone screens (no sideways scroll). Open recommendations: no link to a missing Open site when none is connected; introduction videos play inside ClassProject; YouTube and Vimeo lessons play in-app (referrer fix for YouTube error 153) | 10.1, 27, 49.2 |
| Oct 2026 | Parent portal and the school's Parents & Guardians list fit phone screens: no sideways scrolling, tables become one row per item on phones | 22.3 |
| Oct 2026 | Interactive video: timestamped questions (multiple choice, true/false, multiple select, poll, short answer) on uploaded and YouTube video lessons; editor with draggable timeline markers, preview, drafts and versions; student player with required questions, gentle anti-skipping, retries, feedback and resume; teacher Results with per-question performance, common wrong answers, struggling students and short-answer review; suggested questions from the transcript, always reviewed by the teacher; learning events for later mastery tracking; SCORM export includes the questions as a quiz after the video | 26, 26.2, 26.3, 58.1 |
| Oct 2026 | Interactive video works with Vimeo videos too (Vimeo Player SDK behind the same player layer) | 26.3 |
| Oct 2026 | Content types: PDF, E-book, Presentation and File merged into one **Document** type, labelled from the file (PDF, Slides, Word document, Spreadsheet, Image); uploads limited to formats the viewer can show. Also in the class library | 25.2, 25.3, 26, 58.1 |
| Oct 2026 | Fix: YouTube video lessons added by teachers showed YouTube error 153 (the embed address lost its provider, so no referrer was sent); any YouTube link form now plays (watch, youtu.be, Shorts, embed, with start time) | 27 |
| Oct 2026 | Promotion, repeating and graduation. Each school has ordered class levels with a final year (School Settings → Class levels), and the class form uses them. **Academic → Promotion & Graduation** moves students into the new year: classes are matched one level up by programme and stream (2A1 → 3A1); each student is promoted, repeats, graduates or leaves; new classes and subject registrations are created; it can be undone until the new session starts. A final-year class can graduate early. Graduates keep read-only alumni access for a chosen time, opening on their last session, with their parents following them until it ends. Within a year, Copy structure can carry students forward. Students have a Class history. Schools progress by class or by student (universities and colleges), set by the Super Administrator; schools that progress by student get course registrations from their records system instead | 5, 6.6, 18, 22.4, 58.1 |
