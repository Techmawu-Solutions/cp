@AGENTS.md

# Keep the specification up to date

Every change to the product must also update `Multi-Tenant LMS & Virtual Classroom — Frontend Product Specification.md` in the same commit:

- Describe the new or changed behaviour in the section it belongs to (add a numbered subsection if none fits), written for the product owner — what users can do and see, not implementation detail.
- Add a row to the **Change Log** at the end of the spec (date, change, sections touched).
- Update `README.md` too when demo accounts, sign-in or how to try a feature changes.

# Keep the database schema up to date

`database/schema.sql` is the database behind `lib/types.ts`. Any change that adds, changes or removes an entity or field (a new type, a new property, a new list inside a record) must also, in the same commit:

- update `database/schema.sql`: the table or column, its keys, and a comment on anything not obvious. Lists inside records become their own tables;
- update the collection map in `database/README.md` when a collection or table is added;
- reload the schema into an empty MySQL/MariaDB database to check it still runs (`mysql -u root -e "CREATE DATABASE t" && mysql -u root t < database/schema.sql`, then drop `t`);
- mention the change in the spec's section 58.1 when it changes what the platform keeps, and in its Change Log row;
- once the backend has migrated that table, write the matching migration in the sibling **cpback** repo too. `php artisan schema:compare --only-migrated` there must stay green (cpback `BACKEND_PLAN.md`, decision D9).

# Keep the translations complete

The interface is available in English, French, Portuguese and Spanish (spec section 50.2). English stays in the components. `lib/i18n/dom-translator.ts` translates it at runtime from `lib/i18n/dict/{fr,pt,es}.json`, which are keyed by the English text (whitespace collapsed, JSX entities decoded).

- New or changed interface text needs an entry in all three dictionaries in the same commit. That covers labels, buttons, hints, toasts, placeholders, `aria-label` and `title`.
- A template literal such as `${n} students` is a pattern key: `"{0} students"`.
- Run `node scripts/i18n-extract.mjs . --missing` before you finish. It should list only the deliberate exclusions: language names, CSS class strings, maths samples, and guardian SMS and email bodies.
- Never add user content to the dictionaries: names, course or lesson titles, messages. Mark brand text or other fixed text that must not change with `data-no-translate`.

# Closed academic sessions are read-only

A closed session's records can't be changed by anyone, administrators included (spec section 6.5).

- Every write goes through the store's `insert`, `insertMany`, `update`, `remove`, `removeWhere`, `mutate` and `completeContent`. These refuse changes to a closed session (`lib/session-lock.ts`). Never write with `useStore.setState` to get round them.
- A new collection whose records belong to a session must be added to `SESSION_OF` in `lib/session-lock.ts`. A field that only records reading or watching (such as `views` or `readBy`) goes in `BOOKKEEPING`.
- Screens hide their editing controls with one of two hooks:
  - `useSessionEditable()`, for the session being viewed;
  - `useRecordSessionOpen(sessionId)`, for a record opened outside the selected session (forums, the classroom lobby).
- Only finishing work already under way may write after a session closes. Wrap it in `completing()`; see `forRunningClass` in `lib/actions.ts`.

# The backend (cpback)

The Laravel API that will replace the in-browser data lives in the sibling repo **cpback** (`D:/xampp/htdocs/cpback`, GitHub `Techmawu-Solutions/cpback`).

- Its `BACKEND_PLAN.md` section 0.1 says where the work stands and what comes next. Read it before backend-related work here.
- Each workflow in `lib/actions.ts` and `lib/vacation.ts` maps onto an API operation in that plan's section 8.3. A new multi-record workflow here needs a row there too.
