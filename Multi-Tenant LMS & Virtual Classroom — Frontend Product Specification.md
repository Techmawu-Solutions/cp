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
School Type
WAEC Code
EMIS Code
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

### School Status

```text
Active
Suspended
Pending
Archived
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

Example validation:

```text
12 records require attention

3 missing Student IDs
4 invalid Classes
5 duplicate records
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
- Grid view
- Speaker view
- Picture-in-picture
- Fullscreen

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

- Screen sharing
- File sharing
- Polls
- Quiz
- Whiteboard
- Presentation sharing

## Classroom Management

- Participant list
- Attendance
- Remove participant
- Mute participant
- Disable participant camera
- Lock classroom
- Waiting room

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
└── Subjects

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
Enter WAEC / EMIS Code
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
Create Academic Year
        ↓
Create Academic Session
        ↓
Create Programmes
        ↓
Create Classes
        ↓
Create Subjects
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
- Sidebar
- Top navigation
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

1. Login
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

Students and teachers should be able to use the platform on mobile devices.

### 5. Data-driven

Dashboards should provide useful information rather than simply displaying decorative charts.

### 6. Scalable

The frontend should be designed for thousands of schools and potentially millions of students.

### 7. Ghana-ready

The platform should support:

- WAEC codes
- EMIS codes
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
✓ Notifications
✓ Calendar
✓ Audit Logs
```

The result should feel like a **real production education platform**, even though the initial deployment is a frontend-only prototype on Vercel.