# ClassProject Open: global MOOC platform

**Start here.** This folder holds everything about **ClassProject Open** (working name), the next-generation global MOOC platform.

It is a **separate platform** from ClassProject, the school LMS in the rest of this repository: its own product, database and future codebase. The two are linked in one small way: ClassProject recommends Open courses to its students based on their subjects.

## Files

| File | What it is |
|---|---|
| [`ClassProject Open — Product Specification.md`](ClassProject%20Open%20—%20Product%20Specification.md) | **The source of truth.** The product requirements and architecture: all 25 deliverables the brief asks for, a decision log, the MVP, the roadmap, the backlog, acceptance criteria and the ClassProject integration. **Read §0 first.** |
| [`database/schema.sql`](database/schema.sql) | Open's own MySQL 8 schema (145 tables), verified by loading it |
| [`database/README.md`](database/README.md) | How the schema is organised, its conventions, the ClassProject link tables, and what lives outside MySQL |
| [`prototype/`](prototype/README.md) | **The clickable prototype.** Run `npm install && npm run dev` there, then open http://localhost:3001. Its README has the demo accounts, a 10-minute demo script, and a map from screens to requirements |
| [`../Master Prompt — Next-Generation Global MOOC Platform.md`](../Master%20Prompt%20—%20Next-Generation%20Global%20MOOC%20Platform.md) | The original brief this work answers (kept unchanged apart from a pointer at the top) |

## Where things stand (Sep 2026)

- ✅ The specification v1 is written. It **needs product-owner validation**: see spec §26 for the open questions and §21 for the MVP scope.
- ✅ The database schema v1 is written and loads cleanly.
- ✅ The ClassProject side of the link is built as a prototype: ClassProject spec §49.2; code in `lib/mooc.ts` and `components/student/mooc-recommendations.tsx`. It uses a mock Open catalogue until Open's partner API exists.
- ✅ The **clickable prototype** (phase P0) is built in `prototype/`. It is a Next.js app on mock data with four demo personas, and its partner API really runs. In development, ClassProject's recommendation links open it.
- ⏸ **No production code yet, on purpose.** The prototype is how the product owner validates the spec before Phase 1.

## How to continue in a new chat

Paste something like:

> Read `mooc/README.md` and `mooc/prototype/README.md`, then §0 and the Change Log of `mooc/ClassProject Open — Product Specification.md`. Continue from §0.1 "Next step". Keep the spec, `mooc/database/schema.sql` and `mooc/database/README.md` in step with every change, and reload the schema into an empty MySQL/MariaDB database to check it.

## Working rules

1. **Spec first:** every new requirement goes into the spec: the right section, §0.1 status, and a Change Log row.
2. **Schema in step:** a change to stored data updates `database/schema.sql` and `database/README.md` together, and is then reload-tested.
3. **Separate platforms:** Open never reads ClassProject's database, and ClassProject never reads Open's. They talk only through the signed partner API (spec §25).
4. **Changes on both sides:** a change to the ClassProject ↔ Open link updates **both** specs: this one (§25) and ClassProject's (§49.2).
5. **Stable numbering:** spec sections keep their numbers. Add sub-sections instead of renumbering.
6. **Prototype in step:** while in phase P0, a requirement that changes what learners, instructors or admins see is also added to `prototype/`, and listed in its README table that maps screens to requirements.

## When code starts

The prototype (`prototype/`) is for validation, not the production codebase. The planned production layout (spec §8.3) is `open-api/` (a Laravel 12 modular monolith) and `open-web/` (a Next.js PWA), most likely in their own repository. When that happens, move this folder there, and leave a pointer here and in ClassProject's spec.
