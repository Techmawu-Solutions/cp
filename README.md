# ClassProject — Multi-Tenant LMS & Virtual Classroom (frontend prototype)

Frontend prototype of the platform described in
[`Multi-Tenant LMS & Virtual Classroom — Frontend Product Specification.md`](./Multi-Tenant%20LMS%20%26%20Virtual%20Classroom%20%E2%80%94%20Frontend%20Product%20Specification.md).
It runs entirely in the browser on mock data (spec §65), so it can be deployed to Vercel's free tier with no backend.

The planned database is in [`database/schema.sql`](database/schema.sql) (see [`database/README.md`](database/README.md)).

**ClassProject Open**, the separate global MOOC platform, is specified in [`mooc/`](mooc/README.md): its own spec and its own database schema. Its only link to ClassProject is that students see subject-matched Open courses on their dashboard and on **Explore Beyond Class** (spec §49.2).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (what Vercel runs)
```

Deploy: import the repo in Vercel — no environment variables are needed.

## Demo accounts

The login page has one-click buttons for each persona. Every seeded account uses the password `password`.

| Persona | Email | Shows |
|---|---|---|
| Super Administrator | superadmin@classproject.com | Schools, onboarding, catalogue & requests, RBAC, national/regional/district analytics, Vacation Classes |
| School Administrator | admin@ridgeview.edu.gh | Ridgeview SHS (semesters): sessions, programmes, classes, subjects, students, enrolments, grades, attendance |
| Teacher | eric.dzontoh@ridgeview.edu.gh | Course workspace, content builder, assessments, gradebook, live classroom; also teaches in Vacation Classes |
| Student | john.mensah@ridgeview.edu.gh | Learning dashboard, lessons, quizzes, grades, forums, live classes |
| School Administrator (2nd tenant) | admin@lakeside.edu.gh | Lakeside SHS (terms) — imported with missing EMIS code/district, so it is prompted to complete its profile |
| Vacation Classes Coordinator | vacation@classproject.com | Batches (set up, close out, batch records), bundles & pricing, registrations & payments, teacher matching |
| Student in school + Vacation | ama.boateng@ridgeview.edu.gh | Workspace switcher between Ridgeview and Vacation Classes |
| Regional Officer (custom role) | j.ankrah@ges.gov.gh | A custom platform role with analytics-only permissions |

The public Vacation Classes landing page is at `/vacation`.

**SCORM** (spec §26.2): teachers can add SCORM 1.2 / 2004 packages as course content, which play in-app with the full run-time API and record each learner's status, score, time and resume point; the Super Administrator can export any course as a SCORM package (Content → Courses). The ICT course (SHS 1A) includes a sample package, *Computer Basics (interactive)*, built by `node scripts/build-sample-scorm.mjs`.

**Live classroom with two tabs:** sign-in is per browser tab, so you can start a class as the teacher (eric.dzontoh@…) in one tab and join as a student (ama.boateng@…) in another tab of the same browser — the whiteboard, presentation, screen share and end of class reach the student tab live. Joined alone, a student sees a simulated teacher. Mr. Dzontoh has a saved flip chart ("Types of networks") under **Live Classes → Flip charts**; open it in class from the whiteboard's **Flip chart** menu.

Sign-in also accepts usernames (spec §10.1): every user has a system-generated **platform username** (e.g. `cp1000022`), students have a **school username** made from their school's WAEC code, a number and their admission year (e.g. `0010712-0042-26`), teachers can use their **staff ID** (e.g. `RSHS/STF/001`), and **school administrators sign in only with their school's WAEC code or GES EMIS code** (Ridgeview: `0010712` or `10101203`). The login page lists clickable examples. Lakeside starts without a WAEC code, so its students only have platform usernames until the administrator adds the code and generates school usernames.

## What's simulated

| Area | In the prototype | In production (spec §66–67) |
|---|---|---|
| Data | In-browser database persisted to IndexedDB; **Reset demo data** in the user menu restores it | Laravel API + MySQL |
| Live video | Your own camera/mic/screen are real; classmates are simulated so one browser can demo a full class | LiveKit or similar provider |
| Recordings | A sample video; "processing" is simulated | Provider recording → object storage |
| File uploads | Kept in this browser (IndexedDB), so they still open after a reload; seeded demo files open a generated sample PDF | S3-compatible storage |
| Payments | Mobile Money / card flow is simulated | Payment provider |
| Email / SMS | Shown as in-app notifications | Email/SMS provider |
| ClassProject Open courses | A built-in list of about 30 courses (`lib/mooc.ts`). In development the links open the Open prototype on http://localhost:3001 (run `npm run dev` in `mooc/prototype`); set `NEXT_PUBLIC_MOOC_URL` for a hosted copy | Open's signed partner API, cached for 24 h |

## Structure

```
app/(auth)          login, forgot/reset password
app/(app)           authenticated shell: super-admin/, school/, teacher/, student/, forums, messages, calendar…
app/classroom/[id]  full-screen lobby, live classroom and "class ended" pages
app/vacation        public Vacation Classes landing page and registration/payment
components/         UI building blocks (spec §57): dashboard, tables, classroom, course, assessment, academic, forms…
lib/                types, seed data, store, actions (future API calls), queries, permissions, analytics
database/           planned MySQL schema for ClassProject
mooc/               ClassProject Open (separate MOOC platform): spec + its own database schema
```

`lib/actions.ts` and `lib/vacation.ts` hold every multi-record workflow; each maps to a future API endpoint, so moving to the Laravel backend is a data-layer change.
