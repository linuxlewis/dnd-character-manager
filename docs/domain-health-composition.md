# Health Ownership And Character Detail (R5)

R5 starts from accepted R4b `b94446457a1cf9c812ecd82f1b9341d1d5d5a3e2`
([PR #113](https://github.com/linuxlewis/dnd-character-manager/pull/113), successful
CI run 34157394245). This milestone extracts health backend ownership and composes
existing character responses in the application. Health UI remains character-owned
until R6; its health value imports now use the public health types entrypoint.

## Ownership Map

| Previous owner | R5 owner |
| --- | --- |
| Character health tables and child relations | `src/domains/health/schema/` |
| Character health values, requests, responses and history | `src/domains/health/types/` |
| Health normalization/event calculations in service | `src/domains/health/config/health-update.ts` |
| Health row/history mapping in character repository | `src/domains/health/config/health-mappers.ts` |
| Character health repository/service and initializer | `src/domains/health/repo/` and `service/` |
| Character health PUT handler/contract | `src/domains/health/runtime/` |
| Character detail/create response types | `src/application/character-detail/types/` |
| Combined character read and identity-edit responses | Application `query.ts`, `workflows/character-detail.ts`, `handlers/detail.ts` |
| Character reverse health relations | Remain centrally assembled in `src/database/character-relations.ts` |

Characters still owns identity/list/name/class/level/XP/owner transfer. Its edit
methods return a character ID, with absence mapped to the existing not-found error.
Application workflows compose the resulting detail. There are no compatibility
reexports of health/application types from characters, duplicate table mappings,
or private cross-domain repository imports. Initial health creation continues to
use the transaction supplied by the application creation workflow.

## HTTP Compatibility And Related Reads

The application owns all five combined response contracts: POST create, GET detail,
and PUT name/level/experience. Each returns the existing `character` envelope with
identity, calculated XP progress, health and recent health changes. Health PUT keeps
its `health` and `recentHealthChanges` envelope. Paths, operation IDs, validation,
status codes, anonymous session ordering and query keys remain compatible.

`query.ts` performs one Drizzle relational SELECT, filtering the parent by character
ID and owner. It selects identity columns, required health, and up to five health
events newest first. Public owning calculations derive effective HP and XP; explicit
response construction and Zod parsing prevent ORM/internal fields from leaking.
A missing root or required health returns the existing not-found error (HTTP 404).
One SQL statement supplies a coherent snapshot without a separate history read.

Identity edits preserve the baseline commit-then-read behavior: if required health
is absent, the identity edit can commit before composed detail returns 404. This
refactor does not silently introduce a rollback precondition on identity edits.
Physical SQL names, constraints, indexes, defaults, migrations and stored data are
unchanged. Generated TypeScript changes are ownership imports and ordering; the
OpenAPI JSON remains byte-identical to R4b.

## Health Transaction Semantics

An ordinary health mutation starts a transaction, locks owned identity using the
public character access boundary, then reads persisted health. Pure normalization
runs against that locked state; the repository updates health, conditionally inserts
the event, and loads recent history using the same transaction. Missing ownership
or health produces no write. No-op normalized changes produce no event.

Health PUT remains absolute. Concurrent requests are serial-equivalent: each uses
previous persisted health after locking and commits its state/history atomically.
They are not independent additive damage/heal operations. For initial HP 10/20,
request A with current 10/max 25 yields 15/25; subsequent absolute request B with
current 10/max 30 reads max 25 and yields 15/30. B's previous snapshot equals A's
committed health. No delta protocol, retry-idempotency guarantee or new recovery
behavior is introduced.

Network work is absent from these health transactions. The health initializer
accepts the application's supplied transaction and never starts an independent one.

## Acceptance Evidence

Co-located pure tests cover max/temp increases, clamping, no-op events, deltas and
row/history validation. Handler tests preserve validation-before-session and error
mapping. Existing creation rollback coverage follows the moved public initializer.

Real database tests add:

- One measured executed query at 0, 1 and 7 events, newest-five ordering, explicit
  fields, populated foreign-owner isolation, XP progress and missing/malformed health.
- Production state/event insertion followed by an injected failure, proving both
  writes roll back; no-op and absent/foreign health produce no state/history changes.
- Independent backend connections and `pg_blocking_pids` observations for concurrent
  absolute normalization, health-before-transfer, and transfer-before-health cases.
  Connection cleanup runs on setup failures and in test finalizers.
- Identity name/level/XP edits preserve populated health/history, inventory items/
  treasury, slots and saved spells. Existing browser workflows remain unchanged.

Final local Gate B passed using `VITEST_MAX_WORKERS=4` and the isolated worktree
Compose file plus `/tmp/domain-r2a-compose-network.yml` (subnet 10.253.241.0/28).
The owned stack and network were removed after the run. Build and browser ran
sequentially.

| Check | Result / log |
| --- | --- |
| `pnpm lint` | Pass, `/tmp/domain-r5-lint.log` |
| `pnpm test:unit` | 194 files / 667 tests, `/tmp/domain-r5-unit.log` |
| `pnpm test` | 667 unit, 86 integration, 25 Chromium (41.4s), `/tmp/domain-r5-test.log` |
| `pnpm api:check` | Pass, `/tmp/domain-r5-api-check.log` |
| `pnpm build` | Pass, `/tmp/domain-r5-build.log` |
| `pnpm check:docs` and diff whitespace | Pass, `/tmp/domain-r5-docs.log` |

Rename-aware handwritten source delta: +866/-782, net **+84** lines. Tests:
+1027/-797, net **+230**. Generated TypeScript: +34/-26, net **+8**; OpenAPI JSON
is unchanged. Documentation is excluded from those totals. Four handler test files
are recognized as renames, retaining 67-91% similarity. The ownership map records
split moves that Git cannot represent as simple renames; deleted source lines must
not be reported as all eliminated code.

Concrete simplification: the health repository shrinks from 142 to 95 lines by
removing public pre-read/precomputed-save/history methods; the character repository
loses its aggregate query and health-repository dependency. Moved schema/type/rule/
handler code still exists under its correct owner. New module imports, public entrypoints
and application query/workflow validation account for the overall source increase.
Additional tests provide acceptance evidence rather than replacing production code
with a generic framework.
The first full run had 667 unit tests passing and 85/86 integration tests passing:
its malformed-row fixture used negative HP, correctly rejected by the deployed SQL
constraint before reaching the parser. The corrected fixture uses SQL-valid max HP
10000, outside the domain's existing 9999 limit. The failure log is retained at
`/tmp/domain-r5-test-invalid-fixture.log`; no production constraint was changed.

The boundary report retains only F6 (character page imports inventory UI), assigned
R6. There are no new schema, browser, unresolved import or cycle findings. R10 will
activate the separate strict checker after all planned ownership moves.

The ripwire quality report is advisory evidence, not a clean claim: it reports
42 observations, including 17 gating and 11 new-symbol observations, in
`/tmp/domain-r5-quality.log`. These include relocated clone groups, copied small
boundary parsers, and generated-file churn. The 97-line/complexity-19 detail handler
retains the existing route branches; the repository factory/member clone describes
the same enclosing code, not two implementations.
Runtime parsing remains local to its owner rather than introducing a shared business
framework. Type-only interface dead-code and overlapping factory/member clone reports
require manual interpretation. The actual lint/build/full-test gates remain required.

## Downstream And Rollback

R6 moves health UI and character-page/cache composition using public health types
and generated API contracts. R7 moves spells without changing the application-owned
combined responses. Attributes must add its public schema/value contracts and central
relations, and compose through application queries rather than restoring character
aggregate repositories. Access checks remain narrow and transaction-bound.

An unmerged R5 can be withdrawn or reverted; a deployed change can roll back to the
previous accepted application build without a SQL down migration. Rolling back also
removes R5's stronger health concurrency guarantees.
