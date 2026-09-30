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
- mention the change in the spec's section 58.1 when it changes what the platform keeps, and in its Change Log row.
