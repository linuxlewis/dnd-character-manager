# R4a: Character Access And Atomic Creation

Base: accepted R3 `c1d70de3dd45a3906d46a3cbe89f7331c22a4d64`,
[PR #110](https://github.com/linuxlewis/dnd-character-manager/pull/110), successful
CI run `34155408372`. R4a full Gate B passed; coordinator acceptance pending.

## Public Boundaries

- `characters/access/index.ts` exposes `findOwnedCharacter(userId, characterId,
  connection)` and `lockOwnedCharacter(userId, characterId, transaction)`. Both
  return a parsed character summary or null. Neither reads feature tables. The
  locking operation requires the caller's transaction and acquires `FOR UPDATE`
  on the owned identity row; returning from the helper does not release the lock.
- `characters/service/index.ts` exposes `requireOwnedCharacter(userId, characterId)`
  for service consumers, mapping absence to the existing CharacterNotFoundError.
  Feature repositories may use the narrower persistence access boundary directly.
  The existing spell-slot context lookup now uses it in production.
- Public `initializeCharacterIdentity(userId, input, transaction)` trims/validates
  identity and delegates its insert. `initializeCharacterHealth(characterId, maxHp,
  transaction)` validates initial health and delegates its insert. Neither starts
  a transaction. Health initialization remains character-owned until R5.
- `application/character-detail/workflows/create-character.ts` starts one transaction
  and calls both public initializers. Only after commit does it load the existing
  detail through the character service. R5 replaces this temporary detail composition
  and moves combined types upward; no domain imports the application workflow.

The application creation handler and contract own POST /api/characters. HTTP status,
operation ID, response shape, body-validation-before-session behavior, name trimming,
and initial health values remain unchanged. Generated artifacts are byte-identical.
Application contracts currently reuse public character types until the R5 type move;
this is not a reverse compatibility export or a second schema definition.

## Consolidated Creation Callers

Removed CharacterService.createCharacter and CharacterRepository.createCharacter;
their production route now calls the application workflow. Existing character,
health, spell, slot, and runtime integration factories call that same workflow.
Deleted the unused legacy createCharacterRepo implementation, its sole test, and
its now-unused row adapter/test. Legacy factory max-HP fallback and sort order
were internal test-only behavior, not HTTP contracts; the current application
list/order, creation defaults, owner isolation, and transfer checks remain covered.
Pure ORM relation fixtures still insert deliberate raw records to test missing
health/empty relationships; those fixtures are not alternate creation services.

## Transaction Proofs

- Application workflow integration creates identity and real health on the supplied
  transaction, reads both inside it, then forces initialization to throw. Neither
  row exists after rollback. Invalid initial HP separately fails before health insert
  and rolls back identity. Successful creation checks persisted owner and health.
- Access integration deletes required health and proves the narrow query still
  returns identity. A SQL logger verifies one SELECT with no feature-table reference.
  Stranger/missing identity returns absent; public identity service and production
  spell-slot context lookup also work without health.
- Two independent Postgres clients have distinct backend PIDs. One holds the access
  lock inside its transaction while the other updates ownership; an observer asserts
  `pg_blocking_pids` identifies the blocker. Releasing the first transaction permits
  transfer, after which old-owner locking fails and new-owner locking succeeds.
- Reverse ordering holds an uncommitted transfer and starts old-owner locking.
  Actual blocking is observed; after transfer commits the waiting lock rechecks
  ownership and returns absent. Database statement/poll timeouts bound failure,
  and finally blocks release barriers, settle work, and close both clients.

These prove the access primitive, not transactional safety of every feature.
R4b adopts it in inventory writes; R5 moves health state reads inside the lock;
R7 does so for slots and saved spells. Existing service prechecks alone remain
insufficient for those mutations until their assigned milestones land. No network
work belongs inside a held identity transaction. Future multi-character mutations
must lock identity IDs in stable order before their feature rows.

## Validation And Rollback

Lint, build/typecheck, API freshness, documentation links, and whitespace checks
pass. Final full `pnpm test` exits 0: 185 unit files / 666 tests, 25 integration
files / 74 tests, and all 25 Chromium journeys in 42.2 seconds. Boundary reporting
retains only F6 (character page importing inventory UI), assigned to R6. Logs:
`/tmp/domain-r4a-{install,lint,build,test,api-check,docs,diff,boundaries,quality}.log`.
The full run uses `VITEST_MAX_WORKERS=4` and the coordinator-reserved local Compose
network override at `/tmp/domain-r2a-compose-network.yml` (subnet 10.253.241.0/28).
This environment override is not committed. Owned stack/container/network and
API/web processes are removed afterward; no shared network pruning occurs.

No SQL table, migration, or payload changes occur. A previous application build can
read data created here. Roll back code by reverting the milestone on a new branch
or redeploying the preceding accepted image; no data down-migration is required.
That rollback also removes the new access-lock guarantee. Do not reset another
agent's/shared worktree. R4b remains separately reviewable and unimplemented here.

## Quality Observations

Ripwire quality-delta exits 2 with 11 gating normalized-clone observations; this is
not a clean quality-metric result. No blanket acknowledgement or test/lint waiver
was added. The coordinator reviewed the following deliberate tradeoffs:

- requireOwnedCharacter uses the four-line read/throw-if-absent/return idiom, which
  normalizes to existing get/update/remove/save/requireScope implementations. Those
  functions operate on different state, errors, and domain boundaries; sharing a
  generic cross-domain callback wrapper would obscure the narrow access contract.
- findOwnedCharacter and lockOwnedCharacter share a query builder but have distinct
  supplied-connection/transaction semantics. Their remaining short normalization
  similarity is a non-gating new-symbol observation, not duplicated query logic.
- Six existing character runtime fakeService definitions shrink after deleting
  createCharacter. The clone report reclassifies the smaller common fakes. R5/R7
  will move those route tests to their actual owners; centralizing a broad aggregate
  fake now would retain the coupling that the next milestones remove.
- The new application creation fixture shares ordinary user-insert setup with an
  existing health repository fixture. Each fixture owns cleanup and its scope;
  introducing a shared fixture framework for this pair is not warranted.
- Minor observations are ambient churn on edited symbols and buildServer growing
  by one route-registration line. No complexity or nesting regression was reported.

The first full run found an internal slot-context shape mismatch after adoption;
its adapter now preserves the original className/level-only object. That run is
retained as `/tmp/domain-r4a-test-first.log`. The next run passed all 666 unit and
74 integration tests but two browser pages failed while Vite modules returned
Chromium `net::ERR_NETWORK_CHANGED`. Both traces show those module-load failures;
artifacts and extracted errors are retained in
`/tmp/domain-r4a-browser-network-failure/`. The subsequent run uses unchanged source,
assertions, timeouts, and retry policy. No unrelated task/network was stopped.

Complete staged source accounting includes new application/access modules:
198 lines added, 219 deleted (net -21 handwritten production lines). Tests add 327
and delete 202 (net +125), principally real transaction/rollback and handler coverage.
No generated artifact or migration changes occur. This is responsibility movement
and legacy removal, not a mechanical file relocation; no moved-line reduction is
claimed. Documentation is counted separately.
