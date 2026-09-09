# R4b: Inventory Identity Access And Transactional Ownership

Base: accepted R4a `9e9f77ee4fbd33656f14e4085e225255f01808e3`,
[PR #111](https://github.com/linuxlewis/dnd-character-manager/pull/111), successful
CI run `34156463773`. Coordinator acceptance of R4b is pending.

## Boundaries And Write Ordering

Inventory services and route construction depend on `requireOwnedCharacter`,
not the full character-detail service. Reads authorize against parsed identity;
missing health does not block inventory. The character-facing item repository
exports only item reads and owned mutations. Its old generic CRUD spread and the
unused `ensureCharacterScopeId` write entrypoint are removed. Generic scope/item
repositories retain their existing generic responsibilities.

Every character item create/update/delete/equip/unequip and treasury mutation
requires `{ userId, characterId }`. The repository obtains `lockOwnedCharacter`
inside its transaction before creating scopes or reading mutable state, then
uses that same transaction for state and history. Item IDs remain constrained
by the character's current scope. History actors derive from authenticated owner
context; supplying treasury history metadata cannot grant access or forge the
actor. Catalogue snapshots are fetched before entering repository transactions.

The repository throws `CharacterInventoryAccessError`; service boundaries map it
to the existing `CharacterNotFoundError`, preserving HTTP 404 through persistence
wrappers. Lower layers do not import service errors. Scope/item absence retains
its existing item-not-found behavior. Public URLs, JSON and OpenAPI are unchanged.

## Acceptance Evidence

`character-inventory-ownership.integration.test.ts` uses real repositories and
services with raw identity fixtures deliberately lacking health:

- Stranger item creation and treasury mutation leave no scope. Update, delete,
  equip, unequip and treasury changes leave existing item state/history unchanged.
- For both item and treasury services, ownership transfers after the real service
  precheck but before mutation. Repository reauthorization denies the old owner
  with `CharacterNotFoundError`, creates no scope, and allows new-owner item,
  treasury and history operations without health.
- Actual item and treasury mutations pause after writing real history. A separate
  PostgreSQL connection attempts ownership transfer; distinct backend PIDs and
  `pg_blocking_pids` prove blocking. Before release no history is committed; after
  release feature state/history commit consistently, transfer completes, and the
  history actor is the original authorized owner. Bounded polling/statement
  timeouts and finally cleanup release barriers and settle both operations.

Existing item catalogue/no-op/rollback tests, treasury conflict/conversion/history
rollback tests, and route status checks retain their assertions after adopting
required owner context and narrow authorization fakes. No test bypass is added.

## Validation And Remaining Work

Validation logs: `/tmp/domain-r4b-{lint,unit,build,test,quality}.log`. The full test
run uses `VITEST_MAX_WORKERS=4` and the coordinator-reserved Compose override
`/tmp/domain-r2a-compose-network.yml` (10.253.241.0/28). No shared networks are pruned.
Full Gate B passes: lint, build/typecheck/API freshness, docs/whitespace checks,
185 unit files / 666 tests, 26 integration files / 79 tests, and all 25 Chromium
journeys in 41.8s. The full runner exits 0 and cleans up its owned stack.

R5 still owns health locking/extraction and R7 owns slot/saved-spell locking.
Inventory reads retain their existing precheck/read semantics; this milestone
makes mutation authorization transactionally valid, not a snapshot guarantee for
all reads. No migration or generated artifacts change. Revert the code milestone
on a new branch to roll back; no data down-migration is needed, but that removes
its transactional ownership guarantee.

## Quality Review

Ripwire quality-delta exits 2 with 44 gating findings among 65 observations,
primarily historical churn and normalized clones;
this is not a clean metric result. No acknowledgement or waiver is added. The
scope read and transaction-bound scope lookup share a short query but retain
explicit connection/authorization semantics. Fixture inserts, a promise barrier,
and the small error-translation wrapper match existing idioms; a shared generic
fixture/error framework would couple unrelated boundaries. The injected item
history adapter follows the existing six-argument writer contract. Owner context
and the error constructor are live despite dead-code classifications. Repository
factory verbosity increases by four lines for items and three for treasury; the
treasury mutation grows three lines. These additions bind the ownership check to
state/history writes. No complexity or nesting regression is reported. The
coordinator reviewed and accepted these tradeoffs without requesting metric-driven
source changes.

Complete staged accounting: handwritten production adds 158 and removes 147 lines
(net +11); tests add 400 and remove 178 (net +222), including the new transaction
proofs. Responsibility and API narrowing eliminate broad dependencies and unused
writes while adding mandatory ownership checks; no mechanical moved-line savings
are claimed. Documentation is counted separately. Generated artifacts and
migrations are byte-identical to the accepted base.

The initial runtime suite passed before final build detected that the injected
item writer supplied legacy history details to a typed callback. The test now
uses the existing history parser before forwarding, matching production mapper
normalization. The earlier green runtime log is preserved at
`/tmp/domain-r4b-test-before-adapter-parse.log`; a fresh full run validates the
compiled correction without weakening any assertion, timeout or retry policy.
