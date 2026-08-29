# Character and Party Inventory - Execution Plan

Last verified: 2026-08-29

Status: Draft

## Purpose

This plan turns the [product spec](./party-inventory-merge-spec.md) into parallelizable agent work
packages while preserving a character-first release order. The first two shippable slices expand an
individual character with personal treasury and inventory. Party management begins only after both
personal workflows are complete.

This baseline PR owns M1 and M2 only: A1-A7 and C1-C2. Packages A8-A17 and milestones M3-M8 remain a
future party roadmap retained below for dependency continuity; they are not part of the initial
personal treasury and inventory implementation stack.

Work packages are technical ownership units. The companion
[milestone plan](./party-inventory-milestones.md) combines them into manually testable user outcomes.

## Architecture Baseline

Add an `inventory` domain using the repository's required dependency direction:

```text
Types -> Config -> Repo -> Service -> Runtime -> UI
```

The inventory domain owns inventory scopes, currency rules, item records, party records, and their
APIs. Each scope has an explicit character or party foreign key with an exactly-one-owner constraint.
The existing characters domain continues to own character identity. Cross-domain ownership checks
and character detail composition happen at the service or runtime boundary, never through
lower-layer cross-domain imports.

Build currency and item behavior against character-owned scopes first. Party-owned scopes then reuse
the same treasury, item, and history persistence; only scope resolution and authorization differ.

Cross-domain foreign keys are enforced by SQL migrations. The inventory Drizzle mapping represents
`character_id` as a UUID column without importing the characters repository table; Postgres enforces
the FK, and service/runtime collaboration performs access checks. This preserves the dependency rule
while retaining database integrity.

The existing `catalogue` domain remains the only boundary for D&D source data. It currently ingests
Foundry `spells24` into `catalogue_spells`; equipment is not yet ingested. Inventory work extends the
catalogue with a typed item capability sourced from the same pinned Foundry dataset. It does not add
source-specific clients or parsing to the inventory domain. See the
[catalogue source strategy](./superpowers/specs/2026-07-12-dnd5e-catalogue-source-strategy-design.md).

## Package Dependency Stack

All packages follow `Types -> Config -> Repo -> Service -> Runtime -> UI`. The first release stack is
`A1 -> A2 -> A3 -> A4` for M1 Personal Treasury. M2 Personal Inventory then uses `C1 -> C2` for
catalogue capabilities and `A4 -> A5`, with `C2` required before `A5` completes, followed by
`A5 + C2 -> A6 -> A7`.

The C1/C2 boundary is mandatory for third-party catalogue data. C1 encapsulates Foundry, Open5e,
and legacy source adapters, boundary schemas, explicit source pinning, provenance/license metadata,
and fallback policy. C2 owns typed Foundry `equipment24` ingestion, local `catalogue_items`
persistence, catalogue-owned search/detail routes, readiness/status, deterministic precedence, and
source-audit counts. Inventory consumes a narrow normalized item port and never imports a third-party
catalogue client.

M1 maps to A1-A4. M2 maps to C1-C2 plus A5-A7. Each release requires the corresponding manual
acceptance checklist and focused Playwright e2e gate before the package is considered complete.

## Work Packages

### A1. Inventory Value Types

Writes `src/domains/inventory/types/`.

- Currency denominations, balances, deltas, conversion requests, and insufficient-funds errors.
- Base item fields, item type and rarity enums, SRD references, and filter schemas.
- Inventory scope IDs and character/party owner schemas.
- Character treasury and character item request/response schemas.
- Scope-specific IDs and boundary-safe validation.

Dependencies: none.

Done when unit tests cover valid values, invalid values, denomination conversion, item invariants,
and JSON boundary shapes.

### A2. Character Scope and Treasury Persistence

Writes inventory-scope and treasury Drizzle mappings and
`migrations/0011_inventory_scopes_and_treasuries.sql`.

- Add character-owned `inventory_scopes` and `inventory_treasuries`.
- Resolve one character to one scope through a unique `character_id` foreign key.
- Treat missing scope/treasury rows as zero balance and create them transactionally on first mutation.
- Keep repositories scoped to validated character IDs; do not import the characters repository.
- Parse every database row before returning it.

Dependencies: A1.

Done when the migration applies on a fresh stack and repository integration tests prove owner
uniqueness, isolation, zero-default reads, race-safe creation, and cascade deletion.

### A3. Character Treasury Service and API

Writes currency services, character-treasury contracts, and route handlers.

- Add funds, spend funds, convert denominations, and make change.
- Verify character ownership through a service/runtime collaboration with the characters domain.
- Reject negative results and inaccessible characters.
- Register contracts and regenerate the OpenAPI document and typed client.

Dependencies: A2.

Done when service unit tests, route integration tests, `pnpm api:check`, and generated-client checks
pass.

### A4. Personal Treasury UI

Writes the reusable treasury display and personal-treasury composition on character detail.

- Denomination cards and total GP value.
- Add and spend modals with previews.
- Loading, empty-zero, insufficient-funds, and mutation-error states.
- Focused `tests/e2e/character-treasury.spec.ts` coverage.

Dependencies: A3.

Done when the M1 manual script, component tests, and full e2e suite pass.

### C1. Catalogue Core Encapsulation

Writes shared catalogue provenance, seed-manifest, and capability-boundary types without changing
the existing character spell contract.

- Extract shared source metadata: source, source key/path, rules version, license, raw payload, and
  seed revision.
- Pin the Foundry `dnd5e` source to an explicit tag or commit instead of the moving `master` ref.
- Define typed capability conventions for spell and item search/detail services.
- Encapsulate Foundry, Open5e, and legacy source adapters behind catalogue-owned ports; do not expose
  third-party clients to inventory or character consumers.
- Keep source-specific fetchers and Zod parsers inside catalogue repo/service layers.
- Preserve the current local-first spell behavior and remote fallbacks.

Dependencies: A4 for release sequencing; technically independent of inventory persistence.

Done when existing spell unit/integration behavior remains green and source-manifest tests prove
reproducible source URLs and attribution.

### C2. Catalogue Item Ingestion and API

Writes Foundry `equipment24` parsing, typed item persistence, item search/detail services, catalogue
routes, and `migrations/0012_catalogue_items.sql`.

- Add `catalogue_items` with normalized item fields plus preserved source payload and provenance.
- Seed equipment from the same Foundry repository and pinned revision used by local spells.
- Add typed search/detail contracts under `/api/catalogue/items`.
- Normalize mundane equipment and magic items into one search capability while retaining an
  explicit normalized item kind and source provenance on every result.
- Define deterministic source precedence and deduplication. Never merge 2014 and 2024 records into
  one unlabeled result; Foundry SRD 2024 is the initial local primary source.
- Add source audit output with processed, accepted, rejected, and per-category counts.
- Audit minimum representative coverage for weapons, armor, adventuring gear, consumables, potions,
  scrolls, and magic items so the legacy manager's combined search is not narrowed accidentally.
- Extend the seed command to seed spells and items explicitly and idempotently.
- Add catalogue readiness/status behavior so unseeded item data is not returned as an empty match.
- Document staging/production seed execution separately from database migration execution.
- Keep remote item fallback behind the catalogue service if later needed; it is not required for the
  first local equipment release.

Dependencies: C1.

Done when mapper, repository, service, route, generated-client, idempotency, source-precedence, and
minimum-coverage audit tests pass against representative Foundry fixtures and Postgres.

### A5. Inventory Item and History Persistence

Writes shared item/history Drizzle mappings, repositories, and
`migrations/0013_inventory_items.sql`.

- Add `inventory_items` and `inventory_history_entries`, both keyed by `inventory_scope_id`.
- Store equipment state in the shared item shape; character services control whether it can change.
- Add indexes for scope listing, type filtering, history paging, and source IDs.
- Parse item rows and JSON property fields with Zod.

Dependencies: A4 to begin; C2's table contract must land before the migration and package complete.
Repository work may proceed in parallel with C1 and C2 after M1.

Done when the migration applies and repository integration tests prove scope-isolated CRUD,
filtering, history writes, and cascade deletion.

### A6. Character Item Service and API

Writes character-item services, a narrow catalogue-item consumer port, contracts, and routes.

- Item CRUD and equip/unequip rules.
- Search/filter query behavior.
- Resolve optional catalogue item references through an injected catalogue service and snapshot
  normalized fields into owned inventory items.
- Preserve catalogue source key and rules-version traceability on the owned snapshot without making
  the owned item dependent on later catalogue availability or reseeding.
- Character ownership checks and HTTP error mapping.
- Regenerated OpenAPI and typed client artifacts.

Dependencies: A5, C2.

Done when service, adapter, contract, and route tests pass and `pnpm api:check` is current.

### A7. Personal Inventory UI

Writes reusable item cards, icons, rarity styles, search/filter controls, item forms, and the personal
inventory section on character detail.

- Add manually or through SRD search and auto-fill.
- Use generated `/api/catalogue/items` clients for search and details.
- Inspect, edit, equip, unequip, and delete personal items.
- Preserve the legacy inventory manager's useful visual behavior in Mantine.
- Focused `tests/e2e/character-inventory.spec.ts` coverage.

Dependencies: A6.

Done when the M2 manual script, component tests, and full e2e suite pass.

## Future Party Roadmap

The following packages are retained for the later party merge. They are outside the M1/M2 baseline
and must not block the personal treasury or personal inventory release.

### A8. Party Ownership and Scope Persistence

Writes party-specific schemas, Drizzle mappings, and `migrations/0014_parties.sql`.

- Add `parties` and `party_members`.
- Add the optional `party_id` FK to `characters`.
- Extend `inventory_scopes` with a unique `party_id` FK, make `character_id` nullable, and enforce
  exactly one non-null owner column.
- Create party-owned scopes instead of adding party-specific item or treasury storage.
- Add membership, legacy ID, and natural-key indexes.

Dependencies: A7.

Done when table tests pass and the migration applies to both fresh and existing-character databases.

### A9. Party Repositories

Writes party and membership repositories plus party-scope resolution.

- Party and membership create/list/find/update operations.
- Resolve an authorized party to the same item, treasury, and history repositories used by character
  scope.
- Character-party link persistence.
- Zod parsing for every database result.

Dependencies: A8.

Done when repository integration tests pass against Postgres.

### A10. Party Services

Writes party management, scope authorization, and character-link services.

- Owner/member authorization and passphrase joining.
- Shared item operations using the proven inventory item service with party scope policy.
- Party currency operations using the proven treasury service with party scope policy.
- Inventory history writes using the same scope ID as party items and treasury.
- Character linking limited to accessible parties.

Dependencies: A9.

Done when service unit tests pass with fakes, including unauthorized and insufficient-funds cases.

### A11. Party Contracts and Routes

Writes party route contracts, handlers, runtime registration, and generated API artifacts.

- Party create/list/get/update/join routes.
- Shared item CRUD and filter routes.
- Party treasury and paginated history routes.
- Character-party set/clear route.

Dependencies: A10.

Done when route integration tests pass, generated clients are current, and `pnpm api:check` passes.

### A12. Party Workspace UI

Writes party list, create/edit forms, join flow, detail shell, and navigation.

- Empty, loading, error, validation, and unauthorized states.
- Owner and member views.
- Focused `tests/e2e/party-workspace.spec.ts` coverage.

Dependencies: A11.

Done when the M3 manual script, component tests, and full e2e suite pass.

### A13. Shared Party Inventory UI

Composes the A7 item components against party item APIs.

- Shared item add, SRD auto-fill, search, type filters, details, edit, and delete.
- Party-specific empty states and mutation permissions.
- No equip controls in party scope.
- Focused `tests/e2e/party-items.spec.ts` coverage.

Dependencies: A7, A11, A12.

Done when the M4 manual script, component tests, and full e2e suite pass.

### A14. Party Treasury and Activity UI

Composes the A4 treasury components against party APIs and adds party activity history.

- Shared balances, add/spend previews, and making-change behavior.
- Recent activity and paginated history.
- Focused `tests/e2e/party-treasury.spec.ts` coverage.

Dependencies: A4, A11, A12.

Done when the M5 manual script, component tests, and full e2e suite pass.

### A15. Character-Party Context

Writes the party selector/link action and linked-party section on character detail.

- Set or clear one party link.
- Show personal modules first and shared modules in a separate section.
- Preserve personal data on link and unlink.
- Keep personal modules usable when party data fails.
- Focused `tests/e2e/character-party-link.spec.ts` coverage.

Dependencies: A12, A13, A14.

Done when the M6 manual script, component tests, integration tests, and full e2e suite pass.

### A16. Legacy SQLite Import and Reconciliation

Writes the idempotent SQLite-to-Postgres importer and cutover runbook.

- Parse all source rows with Zod.
- Create one inventory scope per imported party, then attach legacy item, currency, and history rows
  to that scope.
- Resolve legacy standard item IDs to catalogue items when an unambiguous source-key match exists;
  otherwise preserve the legacy source key on the owned item without failing the import.
- Resolve source IDs deterministically and preserve natural keys.
- Support dry-run mode and explicit owner assignment.
- Produce source/target counts, currency totals, rejected rows, and idempotency evidence.

Dependencies: A8 for schema implementation; A13 and A14 for browser spot-check acceptance.

Done when fixture import, reconciliation, idempotency, and production-copy staging dry run pass.

### A17. Cross-Feature Regression and Closeout

Writes the combined Playwright journey and closes release documentation.

- Manage a personal treasury and personal item.
- Create a party and manage shared items and currency.
- Link the character and verify both scopes.
- Exercise desktop and mobile viewports.
- Record migration and rollback evidence.

Dependencies: A15, A16.

Done when the M8 manual script and full validation suite pass.

## Dependency Map

```text
A1 -> A2 -> A3 -> A4
A4 -> C1 -> C2
A4 -> A5; C2 gates A5 completion
A5 + C2 -> A6 -> A7
A7 -> A8 -> A9 -> A10 -> A11 -> A12
A7 + A11 + A12 -> A13
A4 + A11 + A12 -> A14
A12 + A13 + A14 -> A15
A8 + A13 + A14 -> A16
A15 + A16 -> A17
```

## Dispatch Waves

The release order is intentionally stricter than the maximum possible technical parallelism.

```text
Wave 1: A1, A2, A3, A4                              -> M1 Personal Treasury
Wave 2: C1 -> C2, with A5 in parallel; then A6, A7 -> M2 Personal Inventory
Wave 3: A8, then A9 and A10, then A11 and A12      -> M3 Party Workspace
Wave 4: A13 and A14 in parallel                     -> M4 and M5
Wave 5: A15; A16 can run in parallel after A8      -> M6 and M7
Wave 6: A17                                         -> M8 Complete Journey
```

Use one agent per package by default. Agents may work in parallel only when their dependencies are
merged and their file ownership does not overlap.

## Shared File Ownership

Assign these files to one integration owner per wave:

- `src/api-contracts.ts` and generated OpenAPI/client artifacts.
- `src/app-server.ts` and runtime domain registration.
- `src/domains/characters/ui/character-detail.tsx` and its test.
- Migration numbering and the schema migration ledger.

A4, A7, and A15 all compose character detail and therefore run sequentially. A13 and A14 may run in
parallel because they own separate party-page modules. Their agents must not both restructure the
party detail shell owned by A12.

C2 owns catalogue route registration and generated artifacts before A6 begins. A6 consumes those
generated contracts and must not add source-specific catalogue code to the inventory domain.

## Milestone Mapping

- M1 Personal Treasury: A1-A4.
- M2 Personal Inventory: C1-C2 and A5-A7.
- M3 Party Workspace: A8-A12.
- M4 Shared Party Inventory: A13.
- M5 Party Treasury and Activity: A14.
- M6 Character Party Context: A15.
- M7 Legacy Data Cutover: A16.
- M8 Merge Complete: A17.

Focused browser tests ship in the same milestone as their user workflow. A17 adds combined
regression coverage; it does not postpone e2e coverage until the end.
