# R3: Public Schema Registration

Base: accepted R2a `a345d79ab0786d0fd1357a2309480a339ea88a6d`.
Status: full Gate B passed; coordinator review pending.

## Changes

- Character, inventory, and catalogue table mappings now live in public `schema/`
  modules. Six character tables remain character-owned until R5/R7; this move does
  not extract health or spellcasting behavior prematurely.
- `src/database/schema.ts` registers all 17 physical tables once: six character,
  four inventory, three catalogue, and four auth tables. Auth's adapter object and
  the old character-table alias are excluded. Ten meaningful relation definitions
  are registered, with at most one definition per table.
- Owning-side relations live with domain schemas. The character reverse relation
  assembly lives in `src/database/character-relations.ts`, avoiding a character
  schema dependency on inventory. No empty relation definitions are required.
- The database provider exposes schema-aware database, transaction, and shared
  connection types. Client creation remains lazy; importing the registry needs
  neither `DATABASE_URL` nor an open connection.
- Inventory's character and catalogue foreign keys now include the names and
  delete actions already deployed in migrations 0011/0013. No SQL files or other
  physical mappings change, and no migration is introduced.
- Inventory integration database setup moves to `tests/support/`. Existing table
  consumers import public schemas directly. No compatibility bridges remain.
- The legacy shape checker permits only present, declared layers rather than
  requiring empty directories. Its other gates remain active. The new checker
  remains explicitly report-only until R10.

## Acceptance Evidence

- Registry tests verify all 17 table names, unique table objects and relation
  configurations, and absence of adapter/alias duplicates.
- Relation tests verify singular/plural cardinalities and owning columns.
- A real database integration read exercises nested health, spell slots, spells,
  and inventory scope; an owner predicate excludes strangers, another character
  has null health and empty collections, and transaction queries retain inferred
  nested TypeScript types. The counted read must execute exactly one SQL statement.
- Lifecycle tests cover import with no database URL and close/reopen followed by a
  usable typed relational read. Existing API health absence semantics are unchanged.
- Boundary reporting now has one finding: character UI imports inventory UI,
  intentionally reserved for R6. The runtime database helper findings are resolved.
- Lint and 668 unit tests across 184 files pass. Build and API artifact checks pass,
  including API generation check with `DATABASE_URL` unset. The final full run
  passes 69 integration tests across 24 files and all 25 browser journeys.
  Documentation links and whitespace checks pass. Logs are saved under
  `/tmp/domain-r3-{lint,unit,build,api-check,full-test,docs,diff,quality}.log`.

Local validation uses `VITEST_MAX_WORKERS=4`. The full test stack uses a task-owned
Compose override at `/tmp/domain-r2a-compose-network.yml` for subnet
`10.253.241.0/28`, because the host's default Docker address pools are exhausted.
This is local environment configuration, not a repository workaround.

The quality delta reports zero gating regressions. Its two new-symbol dead-code
observations are verified uses: `InventoryRouteDatabaseTracker` is the return type
of the moved helper factory, and Drizzle invokes `logQuery` during the real
one-statement assertion. No suppression or metric-driven abstraction is added.
