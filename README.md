# ClassProject — Multi-Tenant LMS & Virtual Classroom (frontend prototype)

Frontend prototype of the platform described in
[`Multi-Tenant LMS & Virtual Classroom — Frontend Product Specification.md`](./Multi-Tenant%20LMS%20%26%20Virtual%20Classroom%20%E2%80%94%20Frontend%20Product%20Specification.md).
It runs entirely in the browser on mock data (spec §65), so it can be deployed to Vercel's free tier with no backend.

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

Sign-in also accepts usernames (spec §10.1): every user has a system-generated **platform username** (e.g. `cp1000022`), students have a **school username** made from their school's WAEC code (e.g. `0010712-0291`), and teachers can use their **staff ID** (e.g. `RSHS/STF/001`). The login page lists clickable examples. Lakeside starts without a WAEC code, so its students only have platform usernames until the administrator adds the code and generates school usernames.

## What's simulated

| Area | In the prototype | In production (spec §66–67) |
|---|---|---|
| Data | In-browser database persisted to IndexedDB; **Reset demo data** in the user menu restores it | Laravel API + MySQL |
| Live video | Your own camera/mic/screen are real; classmates are simulated so one browser can demo a full class | LiveKit or similar provider |
| Recordings | A sample video; "processing" is simulated | Provider recording → object storage |
| File uploads | Kept in the tab as object URLs (metadata persists) | S3-compatible storage |
| Payments | Mobile Money / card flow is simulated | Payment provider |
| Email / SMS | Shown as in-app notifications | Email/SMS provider |

## Structure

```
app/(auth)          login, forgot/reset password
app/(app)           authenticated shell: super-admin/, school/, teacher/, student/, forums, messages, calendar…
app/classroom/[id]  full-screen lobby, live classroom and "class ended" pages
app/vacation        public Vacation Classes landing page and registration/payment
components/         UI building blocks (spec §57): dashboard, tables, classroom, course, assessment, academic, forms…
lib/                types, seed data, store, actions (future API calls), queries, permissions, analytics
```

`lib/actions.ts` and `lib/vacation.ts` hold every multi-record workflow; each maps to a future API endpoint, so moving to the Laravel backend is a data-layer change.
