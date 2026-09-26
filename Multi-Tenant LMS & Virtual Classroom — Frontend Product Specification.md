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

The platform should support Ghana's geographic hierarchy.

```text
National
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

This hierarchy will support national, regional, district and school-level analytics.

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

## 6.5 Academic Session Selector

The authenticated user's dashboard should have an academic session selector.

Example:

```text
Academic Session

2026/2027 — Semester 1 ▼
```

Changing the session should update the displayed:

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

---

# 10.1 Sign-in Identities and Usernames

Every person has a **platform username** in addition to the names their school uses. The platform username identifies them uniquely across the whole platform, so other existing products (e.g. the school management and admission systems) can integrate against it.

## Platform username (every user)

- Generated by the system when the account is created — never typed in by an administrator.
- Unique across the platform, e.g. `cp1000417`.
- **Never changes**, even if the person's school, WAEC code, email or staff ID changes. Integrations should store this value.

## School username (students)

- Generated by the system using the **school's WAEC code as the prefix** plus a running number: `0010712-0001`, `0010712-0002`, …
- Issued automatically when a student is created or imported at a school that has a WAEC code.
- **If the school has no WAEC code yet**, the student is created with only a platform username and signs in with it.
- When the WAEC code is added later (profile completion prompt, School Settings, or by the Super Administrator), the school administrator is prompted to **generate school usernames** for all students who don't have one. A "Generate usernames" action is also on the Students page for as long as any student is missing one. Students are notified of their new username; their platform username keeps working.

## Staff ID (teachers)

- The teacher's staff ID is **collected from the teacher** (entered by the school when the teacher is added or imported).
- Staff IDs are issued by each school, so the same ID can exist at two schools. If a staff ID matches more than one account, the sign-in page asks the teacher to use their email or platform username.

## Signing in

The sign-in page has a single **"Email, username or staff ID"** field and a password:

```text
Students  → school username (WAEC prefix) · platform username · email
Teachers  → staff ID · email · platform username
Everyone  → email · platform username
```

All sign-in names are case-insensitive. The Vacation Classes "I already have an account" sign-in accepts the same names.

## Where usernames appear

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

Programmes and subjects come from a **platform catalogue** maintained by the Super Administrator, so names and codes are consistent across all schools (which also makes national analytics comparable).

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
- Generate WAEC-prefixed school usernames for students who don't have one (spec §10.1)

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

---

# 23. Bulk Student Import

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

Columns: `first_name, last_name, gender, date_of_birth, admission_year, jhs_index_number, class, guardian_name, guardian_phone, email`. There is **no Student ID column** — Student IDs are generated on import (§22.1). JHS index numbers that lost their leading zeros in Excel (7–9 digits) are padded back to 10 digits with a warning; a full 12-digit index number is accepted and trimmed to the JHS index. Common header names are recognised too (e.g. *BECE Index Number*, *JHS Index*, *Year of Admission*, *Surname*, *DOB*). The preview shows the derived 12-digit index number for every row.

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

---

# 26. Content Types

Teachers should be able to add:

- Text lesson
- Video
- PDF
- E-book
- Presentation
- Assignment
- Quiz
- Assessment
- External link
- Downloadable file
- Live class
- Recorded class

Future support:

- SCORM
- Interactive HTML
- H5P
- AI-generated learning content

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
- Reactions
- Raise hand
- Announcements

## Teaching

- Screen sharing (with the shared screen's sound — see 32.1)
- File sharing
- Polls
- Quiz
- Whiteboard
- Presentation sharing

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

## 32.1 Screen Sharing with Sound

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

---

# 35. Assessment System

Teachers should be able to create:

- Assignments
- Quizzes
- Class tests
- Projects
- Examinations
- Other assessments

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
National
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

Students and teachers who also belong to a school get a **workspace switcher** in the top bar:

```text
[ Ridgeview SHS ▾ ]  →  Ridgeview SHS
                         Vacation Classes
```

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
- Batches (§49.1.7)

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
└── Content Library

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
│   ├── AcademicSessionSelector
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
Attendance
Notification
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

1. Login (email, username or staff ID — spec §10.1)
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
       └── LiveKit / Similar Provider

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