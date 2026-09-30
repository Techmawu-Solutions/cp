# ClassProject Open: clickable prototype (phase P0)

This is a working prototype of **ClassProject Open**, the global MOOC platform specified in [`../ClassProject Open — Product Specification.md`](../ClassProject%20Open%20—%20Product%20Specification.md). It exists to validate the product before real development starts (spec §22, phase P0).

It's built like the ClassProject prototype:
- **Stack:** Next.js 16, React 19, Tailwind v4, and shadcn components on Base UI.
- **Data:** mock data, with each browser's state saved in `localStorage`.
- **Backend:** none, apart from one real API route (the partner API).

## Run it

```bash
cd mooc/prototype
npm install
npm run dev        # http://localhost:3001
```

It runs on **port 3001**, so it can sit beside ClassProject (port 3000). In development, ClassProject's **Explore Beyond Class** links open this prototype, which makes the link between the two platforms clickable end to end.

To deploy it on Vercel, create a **second project** from the same repository with **Root Directory = `mooc/prototype`**. Then set `NEXT_PUBLIC_MOOC_URL` in the ClassProject project to the new URL.

## Demo accounts (`/sign-in`)

| Persona | Shows |
|---|---|
| **Kwesi Mensah, 24**: career switcher | Five weeks into a Data Analyst path, with spreadsheet skills verified, SQL in progress, a capstone project started, 5 reviews due and one certificate |
| **Ama Boateng, 16**: from ClassProject | Under-18 rules (guardian consent pending, private account, safety mode for the tutor), data saver on, and a course reached through a ClassProject referral |
| **New learner** | The full first run: goal prompt → about you (including the under-18 consent step) → diagnostic → personal path |
| **Dr. Kwame Mensah**: instructor | Instructor studio: the coverage gate, AI drafts awaiting approval, and quality flags |

## A 10-minute demo script

**Kwesi**
1. **Today:** the one next-best step and why it was chosen, reviews due, the plan with its projected finish, skills on the four-step ladder, and a dismissible recommendation.
2. **Start** the practice. Use **Hint** twice (nudge → strategy), answer wrongly, and read the explanation, which says the item will come back in review.
3. In the tutor panel, ask *"What is the interquartile range?"*. It answers **From your course** with a source link.
4. Now ask *"Who won the 2010 World Cup?"*. It says it's **Not in your course** instead of guessing. Try **Another example**.
5. Open the **Statistics in Everyday Life** mastery check, pass it, and get a certificate toast.
6. **Portfolio project** (Today → Open project):
   - tick the milestones, write a summary of more than 20 words, and submit;
   - see three calibrated peer reviews and the advisory AI feedback;
   - **Simulate the instructor's assessment**.

   The **Data Analysis Competency** credential is issued.
7. Open **Credentials** → the credential → **Verify** page → **Show machine-readable credential** (the Open Badges 3.0 format).
8. **Skills:** open "Why Verified?" on any skill to see the evidence behind it.
9. Click **Online** in the header to simulate going offline. Keep learning; the banner counts the changes waiting to sync. Go back online and they sync.
10. The feather icon turns on **data saver**: videos play as audio-only with slides.

**Ama:** see the guardian banner, then open `/courses/calculus-first-steps?ref=classproject&subject=EMATH&level=SHS2` for the referral welcome. The portfolio can't be made public. In the tutor, a worrying message is escalated to a person.

**New learner:** type *"I want to become a data analyst in 6 months"*. The six months becomes the plan's deadline. Give a birth year that makes you 15 or 16, answer the quick check, and see what gets skipped.

**Dr. Mensah:** in the studio, switch courses in the coverage check, approve or edit an AI draft, and fix a quality flag.

**Signed out:** `/`, `/explore` (all 7 modes, including *"two weeks to learn Python for data analysis"* in Search), `/careers/data-analyst`, `/partners/classproject`, and `/verify/SAMP-LE26-OPEN`.

## The partner API: real, and signed

`GET /api/v1/partner/recommendations?subjects=EMATH,ICT&level=SHS2` implements spec §25.3:
- HMAC-SHA256 signature headers, and requests older than 5 minutes are rejected;
- any learner identifier is refused (400);
- only secondary-friendly, free courses are returned, each with a reason.

**Demo credentials:**
- key `classproject-demo`;
- secret from `PARTNER_CLASSPROJECT_SECRET` (default `demo-secret-change-me`).
- In development, add `&demo=1` to view the response unsigned.

## What's simulated

| Area | Prototype | Production (spec) |
|---|---|---|
| Data | One learner per browser, in `localStorage`. Signing in as a persona resets it | Laravel API + MySQL (`../database/schema.sql`) |
| Video | Slides with a timed transcript (no media files) | HLS through a CDN (§13) |
| AI tutor | Retrieval over the course's own text, with the real rules: cite or say "not in your course", label every answer, escalate | A grounded LLM through the AI gateway (§12) |
| Mastery | The real model: Bayesian knowledge tracing with evidence weights (§14.4, §15.3) | The same, run by workers |
| Peer and instructor review | Simulated reviewers and instructor | Real people |
| Credentials | Open Badges 3.0-shaped JSON, unsigned | Signed Verifiable Credentials (§16) |
| Offline | A simulated switch that counts changes waiting to sync | Service worker + IndexedDB event log (§7.6) |
| Content | 5 fully written flagship courses and 60 practice items; 26 more courses as outlines | The real catalogue |

## Structure

```
app/(public)     /, sign-in, start (onboarding), explore, courses/[slug], learn/[slug]/[activityId],
                 careers/[id], verify/[code], p/[handle], partners/classproject
app/(learner)    home (Today), path, skills, review, projects/[id], portfolio, credentials, settings, studio
app/api/v1/partner/recommendations   the signed partner API
components/open  shell, bits (badges, cards, Markdown), player (sim video, practice, tutor), portfolio view
lib/data         graph (skills, careers, projects, credentials), courses + authored lessons, item bank
lib              mastery (knowledge tracing), learning (actions), tutor, discover, partner, personas, store
```

## Screens → spec requirements

| Screen | Requirements shown |
|---|---|
| `/` landing | FR-DS-1/2 (goal prompt, six modes), principles P1, P4 and P6 |
| `/start` | FR-ID-4 (under-18 consent), FR-DG-1..3 (diagnostic, test-out), FR-LP-2 (personal path) |
| `/home` | FR-LP-3 (next best step with reason), FR-LP-4 (plan that re-plans itself), FR-DS-4 (dismissible recommendations) |
| `/learn/…` | FR-CA-1 (where this fits), FR-VP-1..4 (player, transcript, chapters, in-video question, audio-only), FR-AI-1..8 (tutor), FR-AD-3 (states) |
| `/skills` | §15.4 (competency graph, evidence, dispute) |
| `/review` | FR-RT-1/2 (spaced, interleaved review) |
| `/projects/…` | FR-PJ-1, FR-PR-1..6 (anonymous, calibrated, weighted peer review; moderation; appeal) |
| `/verify/…`, `/credentials` | FR-CR-1..5, AC-CR-2 |
| `/portfolio`, `/p/…` | FR-PF-1..5 (visibility, never public for under-18s) |
| `/courses/…` | FR-TR-1/2 (transparency block), FR-VP-7 (download size), §25 (referral) |
| `/settings` | FR-LC-1..3 (control, export, delete) |
| `/studio` | FR-CA-3 (coverage gate), FR-ST-3 (AI drafts need approval), FR-QA-3 (flags, never silent edits) |
