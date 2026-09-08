# R7: Spellcasting Backend

Base: accepted R6 `2d6eb6eb831ef4852e2ae7794f71beb8d5d57c95`,
[PR #115](https://github.com/linuxlewis/dnd-character-manager/pull/115),
CI run `34158961988` passed. Status: full Gate B passed; coordinator review pending.

## Ownership

Spellcasting owns saved spells/features, slots, remote defaults, slot history,
value contracts, pure calculations, persistence, services, and all ten existing
spell HTTP operations. Character identity keeps its own types/schema and list
operation. Character UI stays in place until R8 and imports public spellcasting
types. No compatibility reexports or new recovery/attributes functionality are
introduced.

The three physical spell tables and owning relationships move to public
spellcasting schemas. Reverse character relationships remain in database assembly;
all 17 tables and existing relation names register once. SQL identities, keys,
indexes, defaults, migrations, URLs, operation IDs, response fields, and error
messages remain unchanged. Generated TypeScript import metadata follows the new
owner; OpenAPI JSON is unchanged.

The application still owns create/detail/name/level/XP responses and their health
composition/cache behavior. Missing required health retains HTTP 404. Catalogue
lookup remains through its public services, including local/remote fallback,
source/provenance, and existing 502 responses.

## Transactions

Each slot mutation locks the owned identity through `characters/access` before
reading slots. Owning config functions calculate against that fresh state;
slot writes, event writes, and response history use the same transaction. This
replaces the old service-computed snapshot save boundary. Canonical nine-level
zero defaults, partial configuration, usage clamping, no-op history behavior,
and use/restore rejection rules remain intact.

Saved spell insertion/removal reauthorize and lock identity inside their own
transaction, then write and list there. Bucket validation runs after locking;
lookup happens beforehand without holding database locks. The existing unique
key preserves idempotent duplicates while distinguishing source and bucket.
No saved-spell history table or new class/level restriction is added.

Remote defaults use at most two fetch attempts total. Each fetch occurs outside
a transaction. After fetching, lock identity and compare both class and level
with the fetch context. A mismatch returns fresh context and releases the lock
without slot/event writes; retry the fetch once. A second mismatch produces the
existing defaults-unavailable 502. Ownership loss produces 404, without retrying
as the new owner. A matching context normalizes defaults against current slots,
so consumption committed during the fetch survives.

## Validation

- Existing value, adapter, catalogue fallback, service, route, API, and browser
  tests move or adapt to the new owners and transaction inputs.
- Real consumption tests hold one transaction before commit and observe the
  other PostgreSQL backend in `pg_blocking_pids`, then prove no lost usage and
  correct exhausted-slot rejection/event chains. Restore limits remain covered.
- A blocked configuration reads preceding committed usage and emits the correct
  previous/current history while clamping. Failed event insertion after real
  slot and event writes rolls both back; no-op configuration adds no event.
- Saved add/remove and slot use each hold identity until commit; a concurrent
  transfer demonstrably blocks, and all former-owner mutation forms are denied
  afterward. Duplicate/source/bucket and missing-remove behavior are preserved.
- Defaults tests change class or level through an independent connection during
  remote fetch; fresh totals apply, stale totals do not. Repeated changes stop
  after two fetches without writes. Transfer during lookup denies defaults and
  saved-spell insertion; existing remote failure mapping remains covered.
- Final lint and production client/server build pass. Full validation passes
  674 unit tests across 203 files, 98 integration tests across 30 files, and all
  26 browser journeys in 43.5 seconds. Boundary report has zero findings. API
  artifact check passes without `DATABASE_URL`; documentation/whitespace checks pass.

Local full validation uses `VITEST_MAX_WORKERS=4` and the task's Compose file plus
`/tmp/domain-r2a-compose-network.yml` (subnet `10.253.241.0/28`), preserving the
existing isolated-stack procedure. Logs use `/tmp/domain-r7-*.log`.

## Quality Review

The quality-delta tool exits 2 with 48 observations, including 16 gating
observations. These are reviewed explicitly; no suppression is added. Most
dead-code observations identify moved interfaces, error constructors, schema
refinements, catalogue mapping callbacks, or runtime-called service methods with
verified uses. The five verbosity observations identify moved repository/service
factories and route registrars, not five new layers of abstraction.

The duplication observations compare domain-specific row/event mapping and
Fastify route shapes. `registerSpellcastingRoutes` contains the prior slot
handlers, with the identity list removed; saved-spell handlers retain their
existing bodies. `insertSpellSlotChanges` extracts the previous event insert
mapping into a testable transaction writer. Combining these with health writers
or inventory routes would erase domain ownership. Short null-to-not-found
service paths likewise do not justify a cross-domain service framework.
Several reported pairs, including inventory currency/treasury helpers and
character/health update methods, are unchanged by this patch. Structural
similarity after moves does not establish a newly duplicated implementation.
The implementation retains direct, domain-owned operations and documented test
seams rather than introducing wrappers to lower a metric.

The initial full run rejected a new test fixture's noncanonical `/shield` URL;
the production URL schema was preserved. A subsequent fixture expectation still
counted three rows after adding a fourth independent source/bucket case; that
expectation was corrected. The final full run passes. Initial
failure summary is `/tmp/domain-r7-initial-failure.txt`; the complete second
failure log is `/tmp/domain-r7-full-test-second-failure.log`.

Rollback requires reverting the code or redeploying the preceding build; there
is no data migration to reverse. Rolling back removes these concurrency guarantees.

## Change Size

Rename-aware implementation delta is +1,140/-1,143 lines (net -3). Tests/support
are +845/-347, generated TypeScript +21/-19, with 24 detected file renames.
Documentation additions are recorded separately in Git. These counts include
ownership moves and extraction boundaries; they are not a claim of removing
thousands of lines based on deleted old paths alone.
