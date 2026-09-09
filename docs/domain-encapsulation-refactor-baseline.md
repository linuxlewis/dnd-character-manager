# Domain Refactor R0: Baseline And Decisions

Prepared: 2026-09-07. Status: R0 submitted for coordinator review.

## Pinned Evidence

- Implementation base: `origin/main` at `faf519271e2b06a825025ba433c38005340b116e`.
- Earlier attributes review: `e104044c39982ea3167afa9ffa10f13f393fab4c`.
- Source inventory below comes from the implementation base, not unmerged attributes.
- Independent baseline verifier used `/home/sbolgert/.codex/worktrees/domain-baseline`
  detached at the implementation base, with a clean final worktree.
- Baseline `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm api:check`,
  `pnpm test:unit`, `pnpm build`, `pnpm check:docs`, `pnpm test`, and
  `git diff --check` all exited 0. Unit: 173 files / 575 tests. Integration:
  23 files / 68 tests. Chromium e2e: 25 tests, no retries/failures, 43.5 seconds.
  The owned local stack was removed after the full run.
- Logs: `/tmp/domain-baseline-{install,lint,api-check,test-unit,build,check-docs,test}.log`.
  These local logs are supplemental evidence; subsequent PR checks must verify their own SHA.
- Coordinator checked successful trunk CI run `33977430029` and deployment run `33977644806`.
- No baseline command failures or environment prerequisites were observed. The structural and
  transaction gaps below are source findings, not failed tests or refactor regressions.

## Physical Model Ownership

All six character-related mappings currently live in
`src/domains/characters/repo/character-table.ts`. Preserve SQL names, constraints, indexes,
cascade behavior, and migrations. R3 first changes the schema boundary; R5/R7 change owners.

| Current export / SQL table | Final owner / destination | Relationship |
| --- | --- | --- |
| `charactersTable` (`characterTable` alias) / `characters` | `characters/schema/tables.ts` | Many characters to one required auth user |
| `characterHealthTable` / `character_health` | `health/schema/tables.ts` | At most one row per character by PK; required by detail API invariant |
| `characterHealthEventsTable` / `character_health_events` | `health/schema/tables.ts` | Zero or many events per character |
| `characterSpellSlotsTable` / `character_spell_slots` | `spellcasting/schema/tables.ts` | Zero to nine rows, unique character and spell level |
| `characterSpellSlotEventsTable` / `character_spell_slot_events` | `spellcasting/schema/tables.ts` | Zero or many events per character |
| `characterSpellsTable` / `character_spells` | `spellcasting/schema/tables.ts` | Zero or many; unique character, slot level, source, spell index |

Prerequisite registration also accounts for existing non-character mappings:

| Existing file under `src/` | Final definition owner / destination |
| --- | --- |
| `providers/auth/schema.ts` (`user`, `session`, `account`, `verification`) | Keep auth provider ownership and leaf schema; register once |
| `domains/inventory/repo/inventory-scope-table.ts` | `inventory/schema/inventory-scope-table.ts` |
| `domains/inventory/repo/inventory-treasury-table.ts` | `inventory/schema/inventory-treasury-table.ts` |
| `domains/inventory/repo/inventory-item-table.ts` | `inventory/schema/inventory-item-table.ts` |
| `domains/inventory/repo/inventory-history-table.ts` | `inventory/schema/inventory-history-table.ts` |
| `domains/catalogue/repo/catalogue-item-table.ts` (items and audits) | `catalogue/schema/catalogue-item-table.ts` |
| `domains/catalogue/repo/catalogue-spell-table.ts` | `catalogue/schema/catalogue-spell-table.ts` |

All domain schema exports go through `schema/index.ts`. Inventory scopes use their existing
owner representation; do not invent a new FK or change inventory semantics during registration.
One Drizzle table object must represent each physical table. Remove the duplicate character
alias from the aggregate registry even if a temporary compatibility export exists elsewhere.

Health is physically optional from the parent side because the child FK cannot require a child.
Current detail uses an inner join, so missing health produces no detail and HTTP 404. Preserve
that behavior rather than returning null/default HP. New creation must always establish health.
Health history returns five newest events by descending `createdAt`; equal timestamps have no
baseline order guarantee. Spell-slot history also returns five newest events. Slot API fills
missing levels 1-9 with zero counts; an empty spell collection is valid. Reverse relationships
are assembly-owned, with one configuration per table and no character-to-feature schema import.

## Operation And Payload Inventory

Current contracts are `characters/runtime/contract.ts` and
`characters/runtime/character-spell-contracts.ts`; schema definitions are predominantly in
`characters/types/character.ts`. Exact paths and methods below are extracted from the baseline
OpenAPI artifact. The application owns responses composing health and identity, including
creation and identity edits. Health and spellcasting own their feature response contracts.

| Method / path | operationId | Success status | Final HTTP owner |
| --- | --- | --- | --- |
| `POST /api/characters` | `createCharacter` | 201 | `application/character-detail` |
| `GET /api/characters` | `listCharacters` | 200 | `characters` |
| `GET /api/characters/{characterId}` | `getCharacter` | 200 | `application/character-detail` |
| `PUT /api/characters/{characterId}/level` | `updateCharacterLevel` | 200 | `application/character-detail` |
| `PUT /api/characters/{characterId}/name` | `updateCharacterName` | 200 | `application/character-detail` |
| `PUT /api/characters/{characterId}/experience` | `updateCharacterExperience` | 200 | `application/character-detail` |
| `PUT /api/characters/{characterId}/health` | `updateCharacterHealth` | 200 | `health` |
| `GET /api/characters/{characterId}/spell-slots` | `getCharacterSpellSlots` | 200 | `spellcasting` |
| `PUT /api/characters/{characterId}/spell-slots` | `updateCharacterSpellSlots` | 200 | `spellcasting` |
| `POST /api/characters/{characterId}/spell-slots/use` | `useCharacterSpellSlot` | 200 | `spellcasting` |
| `POST /api/characters/{characterId}/spell-slots/restore` | `restoreCharacterSpellSlot` | 200 | `spellcasting` |
| `POST /api/characters/{characterId}/spell-slots/apply-defaults` | `applyCharacterSpellSlotDefaults` | 200 | `spellcasting` |
| `GET /api/characters/{characterId}/spells` | `listCharacterSpells` | 200 | `spellcasting` |
| `POST /api/characters/{characterId}/spells` | `saveCharacterSpell` | 200 | `spellcasting` |
| `GET /api/characters/{characterId}/spells/{spellId}` | `getCharacterSpellDetails` | 200 | `spellcasting` |
| `DELETE /api/characters/{characterId}/spells/{spellId}` | `removeCharacterSpell` | 200 | `spellcasting` |
| `POST /api/characters/{characterId}/spells/search` | `searchCharacterSpells` | 200 | `spellcasting` |

| Operations | Existing response schema / JSON envelope |
| --- | --- |
| create/get/name/level/experience | `CharacterDetailResponseSchema`: `{ character: { id, name, className, level, experiencePoints, experience, health, recentHealthChanges } }` |
| list | `ListCharactersResponseSchema`: `{ characters: [{ id, name, className, level }] }` |
| health update | `UpdateCharacterHealthResponseSchema`: `{ health, recentHealthChanges }` |
| slot get/configure/use/restore/defaults | `CharacterSpellSlotsResponseSchema`: `{ spellSlots, recentSpellSlotChanges }` |
| spell list/save/remove | `CharacterSpellsResponseSchema`: `{ spells }` |
| spell search | `SearchCharacterSpellsResponseSchema`: `{ spells }` (catalogue candidates) |
| spell details | `CharacterSpellDetailsResponseSchema`: `{ spell }` (saved record plus external detail) |

Preserve all nested fields and validators, existing 400/404/502 errors, and session behavior.
R5 moves `CreateCharacterRequestSchema` to application types because its `maxHp` belongs to
health; core identity types do not import health. Apply the same rule to detail schemas.
R5 may group creation/edit contracts in character-detail composition without creating a
synthetic endpoint. Identity mutation rules remain character-owned.

Generated GET keys are `['api', operationId, params]` for `getCharacter`,
`getCharacterSpellSlots`, `listCharacterSpells`, and `getCharacterSpellDetails`;
`params` is `{ characterId }`, plus `spellId` for spell detail. `listCharacters` is
`['api', 'listCharacters']`. Search is POST and has mutation helpers, not a GET query key.
Use the generated factories rather than spelling these arrays in application code.
Health success reconciles detail health/history. The current character list contains no
health, so do not invalidate it for health-only changes. Identity edits reconcile detail/list.
Spell mutations reconcile saved lists/details or slots/history at their current generated keys.
Application callbacks own any combined-response consequences.

## Access, Creation, Transfer, And Transactions

Baseline production creation is `createCharacterService -> createCharacterRepository`.
It inserts identity and health together, initializing current HP to requested maximum and
temporary HP to zero, then loads detail after commit. Legacy `createCharacterRepo.create`
also inserts both in one transaction, using max HP 1 if absent; its known callers are tests.
R4 must inventory callers again and consolidate production and test factories around the
application creation workflow, deleting unused legacy paths when safe. No API requires the
legacy repository interface itself to survive.

Anonymous linking is wired in `src/app-server.ts`: the auth callback invokes
`CharacterService.transferCharactersToUser`, which updates `characters.user_id`. Related
health/spell/inventory records stay attached through stable character identity. Same-user
transfer is a no-op. Do not move this business update into the auth provider.

Baseline health and slot saves recheck ownership inside their transactions but do not lock
the identity row; their services read state before saving. Saved-spell operations also need
an explicit transactional ownership audit in R7. These are gaps to address, not evidence of
serializable writes. Creation is already atomic; detail/history currently uses separate reads.

The chosen access API is `characters/access/index.ts`, with two narrow operations:
`findOwnedCharacter(userId, characterId, connection)` returns identity/class/level only;
`lockOwnedCharacter(userId, characterId, transaction)` performs the owner-scoped identity
row lock and returns the same context or absence. Concrete exported names can be adjusted
by R4, but the result must exclude health/history and the lock must use the caller's transaction.
Foreign repositories may import this specific access boundary, never `characters/repo`.

Application creation calls public identity and health initialization services with one shared
transaction. Domain services delegate to their own repositories. Never import foreign private
repositories into application code just to share a transaction. Domain services cannot import
application workflows; routes owning combined responses move upward with their handlers.

## Required Verification Scenarios

| Scenario | Baseline evidence / target proof | Owner |
| --- | --- | --- |
| Create identity plus initial HP | Existing character repository integration tests; inject health initializer failure and assert neither row survives | R4 |
| Both existing creation paths | `character-repo.integration.test.ts` and `character-repository.integration.test.ts`; update callers or remove obsolete factory deliberately | R4 |
| Owner isolation | Existing route/repo tests; owner succeeds, stranger gets 404, no mutation/history for stranger | R4/R5/R7 |
| Ownership changes during mutation | New controlled two-connection test: owner lock blocks transfer, or completed transfer prevents old owner mutation | R4 |
| State/history stay coherent | Mutations read feature state after identity lock and write state/event in same transaction; concurrent slot use cannot overwrite consumption | R5/R7 |
| Anonymous transfer | Existing character transfer tests plus linked-owner access to health/spells and old-owner denial; same-user no-op | R4/R11 |
| Missing required health | Delete health in fixture; composed detail remains 404, never a synthetic healthy state | R5 |
| Related read shape and cost | Real Drizzle query with inferred nested types, owner filter, empty collections, five newest history entries; record measured bounded SQL statement count | R3/R5/R7 |
| Level/name/XP side effects | Existing `routes.level-side-effects.integration.test.ts`; preserve health/spells/inventory when editing identity | R5/R7 |
| Health cache | Mounted health mutation changes displayed combined detail; rejected mutation does not fabricate success | R6 |
| Spell workflows | Existing mounted/browser tests plus independent search/details/removal failure transitions and slot pending/history reconciliation | R8/R9 |

## Existing Coupling And Assigned Remedies

| Current coupling | Remedy / milestone |
| --- | --- |
| Character table file contains all feature tables; broad types barrel mixes features | Public schema registration R3; separate health R5 and spellcasting R7 |
| Character repository loads health/history for all detail returns | Application detail relational query R5 |
| Inventory services/runtime accept full `CharacterService` for access | Replace with narrow public access/service contract R4; R2 inventories exact consumers |
| Inventory test helper imports private character table path | Use public schema and application test factory R3/R4 |
| Character page assembles inventory and feature UI | Move composition to application UI R6/R8 |
| Spell defaults/details external clients and catalogue adapter live under characters | Move with spellcasting R7; preserve catalogue public service boundary |
| `types/` contains calculations such as XP/currency planning | Adopt client-safe owning `config/` policy; R2 assigns exact migration prerequisites rather than blanket exemptions |
| Provider database handle exposes every registered table | Import checks enforce boundaries, reviewers inspect table reads/writes and raw SQL; narrow access API handles transactional identity |

## R0 Handoff

Owner: R0 documentation agent. Base SHA above. Delivered SHA is the commit containing this
record; coordinator records the verified SHA and PR in the milestone ledger after review.
Owned files: architecture/implementation/OpenAPI guidance, this baseline, brief, milestones,
and AGENTS navigation. No application code or migrations changed. Gate D results are recorded
in the R0 delivery message and PR. Baseline full-test evidence is independent and listed above.

Acceptance coverage: all six extracted physical models have destinations; cardinality/absence
and history limits are specified; creation/transfer/locking scenarios are named; public schema,
access, and pure-calculation choices are fixed; baseline passes are separated from source gaps.
No compatibility bridge is introduced by R0. R3 must start a bridge ledger if needed and R10
must remove temporary exports. R2 owns complete resolver findings, including prerequisites
outside the extracted domains. R0 remains in review until coordinator acceptance.
