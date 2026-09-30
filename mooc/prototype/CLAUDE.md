@AGENTS.md

# ClassProject Open prototype: working rules

This is the phase-P0 clickable prototype of **ClassProject Open**, a separate platform from ClassProject. Start with `../README.md` and this folder's `README.md`.

- **The spec is the source of truth:** `../ClassProject Open — Product Specification.md`. Every change to what the prototype does is also written there:
  - in the section it belongs to;
  - in section 21.1 if it changes what the prototype shows;
  - in the section 0.1 status;
  - in a Change Log row.
- **Data the platform would store** changes `../database/schema.sql` and `../database/README.md` in the same change, and the schema is then reloaded into an empty MySQL/MariaDB database.
- **Screens:** update this folder's README table that maps screens to requirements, and its demo script, when you add or change a screen.
- **The link to ClassProject:** a change to it (partner API, referral, matching rules) updates Open spec section 25 **and** ClassProject spec section 49.2. The course slugs in `lib/data/courses.ts` must match ClassProject's `lib/mooc.ts`.
- **State:** it lives in `lib/store.ts` (localStorage). Bump `STATE_VERSION` when its shape changes, and update `lib/personas.ts`.
- **Checks before you finish:** `npx tsc --noEmit`, `npx eslint .` and `npx next build`.
