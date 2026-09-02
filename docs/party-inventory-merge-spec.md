# Character and Party Inventory - Product Spec

Last verified: 2026-08-29

Status: Draft

## Summary

Expand the D&D Character Manager in a character-first sequence, then merge in the shared features
from the existing D&D Party Inventory Manager.

Each character first receives an independent inventory scope containing a treasury and items. Parties
are introduced after those workflows are usable and receive the same underlying scope model. The
owner mapping and authorization rules differ, while currency, items, history, search behavior, icons,
and rarity presentation are shared. A character can later be linked to one party so the character
page shows personal and shared resources as clearly separate scopes.

The companion [execution plan](./party-inventory-merge-plan.md) defines agent work packages and
dependencies. The [milestone plan](./party-inventory-milestones.md) defines the manually testable,
shippable release slices.

## Release Acceptance Principle

Delivery follows complete user workflows in this order:

1. Personal character treasury.
2. Personal character inventory.
3. Party creation and membership.
4. Shared party inventory.
5. Shared party treasury and activity.
6. Character-party linking.
7. Legacy production-data migration.

A user-facing milestone is complete only when it can be exercised manually in a running stack and
its critical path has a focused Playwright test. Unit and integration tests remain required for
rules, persistence, and API boundaries.

This baseline PR covers only M1 Personal Treasury and M2 Personal Inventory. The party, linking,
and legacy-import outcomes listed later are retained as a future roadmap and do not expand the
initial A1-A7/C1-C2 implementation stack.

## Implementation Package Baseline

The implementation follows the repository stack order `Types -> Config -> Repo -> Service -> Runtime
-> UI`. Package boundaries and dependencies for the first two releases are fixed as follows:

| Package | Boundary | Dependency and release role |
|---|---|---|
| A1 | Inventory value types and Zod boundary schemas | Foundation; no dependency |
| A2 | Character inventory scopes and treasury persistence | A1; repository and migration work |
| A3 | Character treasury service and API | A2; service/runtime boundary |
| A4 | Personal treasury UI and e2e journey | A3; closes M1 |
| C1 | Third-party catalogue core and typed source ports | A4 for release order; owns Foundry/Open5e adapters, source schemas, pinning, license/provenance, and fallback policy |
| C2 | Third-party equipment ingestion and catalogue API | C1; owns typed Foundry `equipment24` ingestion, source audit/status, and generated search/detail contracts |
| A5 | Personal item and history persistence | A4 to begin; C2 contract gates completion |
| A6 | Character item service and API | A5 + C2; consumes only the catalogue item port |
| A7 | Personal inventory UI and e2e journey | A6; closes M2 |

The package dependency stack is `A1 -> A2 -> A3 -> A4`, then `C1 -> C2` alongside A5, followed by
`A5 + C2 -> A6 -> A7`. M1 is A1-A4. M2 is C1-C2 plus A5-A7. C1 and C2 are catalogue-owned
third-party integration packages: inventory and character code never call Foundry, Open5e, or
dnd5eapi directly.

## Milestone Validation Contract

Manual acceptance is required for both M1 and M2, using the checklists in
[party-inventory-milestones.md](./party-inventory-milestones.md). Each checklist must be exercised
against a running stack, and each critical path must ship with its focused Playwright spec:
`character-treasury.spec.ts` for M1 and `character-inventory.spec.ts` for M2. The M1 and M2 automated
gates are `pnpm lint`, `pnpm test:unit`, `pnpm test:integration`, `pnpm api:check`, `pnpm test:e2e`,
and `pnpm build`.

## D&D 5e Catalogue Boundary

The repository already has a `catalogue` domain and a local Postgres `catalogue_spells` table. The
current `pnpm seed` command downloads Foundry `dnd5e` SRD 2024 `spells24` YAML, normalizes it, and
upserts it locally. Character spell behavior prefers that local catalogue when seeded and retains
remote Open5e/legacy fallbacks. Equipment from Foundry's `equipment24` pack is documented but is not
currently ingested.

Inventory item search must extend this existing catalogue boundary rather than adding a D&D API
client inside the inventory domain.

```text
Foundry/Open5e source adapters
             |
             v
Catalogue source parsing and normalization
             |
      +------+------+
      |             |
 typed spells   typed items       future typed capabilities
      |             |             such as monsters
      v             v
character spell   inventory item
consumer adapter  consumer adapter
```

Catalogue encapsulation requirements:

- The catalogue domain owns source URLs, source-specific schemas, downloads, license/provenance
  metadata, seed auditing, local persistence, and any remote fallback policy.
- Spells and items use typed schemas, repositories, and services. Do not expose a single unbounded
  JSON record as the application model merely to anticipate future entry types.
- Shared catalogue primitives cover source, source key/path, rules version, license, display name,
  raw source payload, seed batch metadata, and source-audit results.
- Add a typed `catalogue_items` projection sourced from the same pinned Foundry `dnd5e` dataset as
  local spells. A future monster projection can follow the same capability pattern without changing
  inventory or character APIs.
- Inventory consumes a narrow normalized item lookup/search port. It does not know whether a result
  came from Foundry, Open5e, or another approved source.
- The item capability presents mundane equipment and magic items through one search contract while
  retaining a normalized item kind, source, source key, and rules version on each result.
- Catalogue services own deterministic cross-source precedence and same-version deduplication.
  Records from different rules versions remain distinct and visibly labeled rather than being
  silently merged by name.
- Browser item search uses generated catalogue API clients. It never calls Foundry, Open5e, or
  dnd5eapi directly.
- Owned inventory items are snapshots. An optional catalogue item reference records origin, but
  catalogue reseeding must not silently rewrite a character or party's saved item.
- Source data must be pinned to an explicit Foundry tag or commit for reproducible production seeds;
  the current `master` default is a known gap to close before item ingestion ships.
- Catalogue readiness distinguishes an unseeded dataset from a valid zero-result search. Missing
  local item data must produce an operationally visible unavailable/not-seeded state, not an empty
  search result that misleads users.
- Catalogue seed execution is a deployment/runbook concern separate from schema migrations. Staging
  and production release gates must record the pinned revision and accepted record counts.

Initial inventory scope includes mundane equipment and magic-item ingestion, unified item
search/detail, and auto-fill. Its source audit covers weapons, armor, adventuring gear, consumables,
potions, scrolls, and magic items before M2 ships. It does not include monster ingestion, a universal
rules engine, or a refactor of stable spell behavior.

## User Outcomes

A player can:

- Track PP, GP, SP, and CP separately for each character.
- Add and spend personal currency with previews and automatic making-change.
- Add, search, inspect, edit, equip, unequip, and remove personal items.
- Search D&D 5e SRD equipment by name and auto-fill item details.
- See item type icons, rarity colors, quantity badges, and item detail panels.
- Create or join a party with a separate shared treasury and shared item pool.
- Manage shared party items, currency, and activity history.
- Link a character to one party and see personal and shared resources without combining ownership.
- Import legacy party inventory data from production SQLite into Postgres.

## Primary User Flows

### Personal Treasury

1. The player opens an existing character detail page.
2. The page shows that character's PP, GP, SP, and CP balances and total GP value.
3. The player adds or spends currency through a modal with a result preview.
4. Adding preserves the entered denominations; spending subtracts from total copper value and greedily
   normalizes the entire remaining balance from PP to GP to SP to CP without creating a negative total.
5. Currency changes persist independently for each character.

### Personal Inventory

1. The player opens a character detail page and sees a personal inventory section.
2. The player adds an item manually or searches the SRD and auto-fills the form.
3. The player searches and filters personal items by name and type.
4. The player opens item details, edits the item, and equips or unequips it.
5. The player removes an item through a confirmation flow.

## Future Party Roadmap

The following flows are retained for the later party merge after M1 and M2 are complete.

### Party Workspace

1. The player opens the party workspace.
2. The player creates a party with a name, optional description, and optional passphrase.
3. The app adds the current user as owner and opens the party page.
4. Another signed-in user can join through the legacy-compatible slug and passphrase path.

### Shared Party Inventory

1. A party member opens the party page and sees the shared item pool.
2. The member uses the same item card, icon, rarity, SRD search, filter, and detail behavior as
   personal inventory.
3. Shared item mutations affect the party only and create party activity entries.

### Shared Party Treasury

1. A party member sees the party's independent PP, GP, SP, and CP balances.
2. The member adds or spends currency using the same conversion and making-change rules as personal
   treasury.
3. Currency changes create readable party activity entries.

### Character Party Context

1. The player links one of their characters to a party they can access.
2. The character page shows personal treasury and inventory first.
3. A separate party section shows the linked party's treasury and shared items.
4. Unlinking removes the party section without changing or moving any resources.

### Legacy Import

1. The operator copies the source SQLite database to a known non-production path.
2. The operator runs a dry run with an explicit target owner user ID.
3. The importer validates and maps legacy parties, items, currency, and history.
4. The operator runs the import, repeats it to prove idempotency, and reconciles source and target.

## Data Model

### Catalogue Items

`catalogue_items` is a typed, read-only application projection of approved equipment source data. It
shares provenance conventions with `catalogue_spells` without forcing both record types into one
generic payload model.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key and stable inventory reference |
| `source` | text | Normalized catalogue source |
| `sourceKey` | text | Source-owned stable key; unique with source |
| `sourcePath` | text | Traceable path or endpoint |
| `rulesVersion` | text | `2014` or `2024` |
| `license` | text | Preserved source license metadata |
| `itemKey` | text | Normalized application key |
| `name` | text | Search/display name |
| `itemType` | text | Normalized equipment, potion, scroll, consumable, or misc type |
| `category` | text | Weapon, armor, adventuring gear, magic item, or similar |
| `rarity` | text | Optional normalized rarity |
| `description` | text | Normalized readable description |
| `weight` | real | Optional pounds |
| `estimatedValue` | real | Optional GP snapshot |
| `properties` | jsonb | Typed item-specific normalized properties |
| `sourcePayload` | jsonb | Preserved parsed source document for future remapping |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

Catalogue upserts use `(source, sourceKey, rulesVersion)` as the source identity and retain a stable
row ID, so 2014 and 2024 records remain distinct.

### Inventory Scopes

An inventory scope is the shared container for treasury, items, and activity. Ownership uses explicit
nullable foreign-key columns instead of a polymorphic `ownerType` and `ownerId` pair. A database
constraint requires exactly one owner, preserving referential integrity and cascade deletion.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `characterId` | UUID | Nullable unique FK to `characters`, cascade delete |
| `partyId` | UUID | Nullable unique FK to `parties`, cascade delete |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

Constraint: exactly one of `characterId` or `partyId` is non-null. The character-first migration can
initially require `characterId`; the later party migration makes it nullable, adds `partyId`, and adds
the final exactly-one-owner constraint.

A missing character scope is read as an empty inventory and zero treasury. The first treasury or
item mutation creates it transactionally. Party creation normally creates its scope in the same
transaction. The importer may derive scope IDs deterministically from legacy party IDs.

### Inventory Treasuries

One treasury belongs to one inventory scope, regardless of whether a character or party owns it.

| Field | Type | Notes |
|---|---|---|
| `inventoryScopeId` | UUID | Primary key and FK to `inventory_scopes`, cascade delete |
| `copper` | integer | Default 0, minimum 0 |
| `silver` | integer | Default 0, minimum 0 |
| `gold` | integer | Default 0, minimum 0 |
| `platinum` | integer | Default 0, minimum 0 |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

A missing treasury row is read as a zero balance and created on the first currency mutation.

### Inventory Items

The same item table serves character and party scopes.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `inventoryScopeId` | UUID | FK to `inventory_scopes`, cascade delete |
| `name` | text | Required |
| `type` | text | `equipment`, `potion`, `scroll`, `consumable`, `misc` |
| `category` | text | Weapon, Armor, Potion, Wand, or similar |
| `rarity` | text | `common`, `uncommon`, `rare`, `very_rare`, `legendary`, `artifact` |
| `description` | text | Optional |
| `quantity` | integer | Default 1, minimum 1 |
| `weight` | real | Optional, in pounds |
| `estimatedValue` | real | Optional, in GP |
| `notes` | text | Optional |
| `thumbnailUrl` | text | Optional |
| `catalogueItemId` | UUID | Optional FK to `catalogue_items`, set null if catalogue row is removed |
| `catalogueSourceKey` | text | Optional source-key snapshot for traceability/import matching |
| `properties` | jsonb | Type-specific dictionary |
| `isEquipped` | boolean | Default false |
| `statModifiers` | jsonb | Optional additive bonuses; stored but not computed initially |
| `statOverrides` | jsonb | Optional overrides; stored but not computed initially |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

`isEquipped`, `statModifiers`, and `statOverrides` are valid only through character-scoped services.
Party-scoped routes always return `isEquipped: false` and reject equipment-state mutations.

### Parties

A party is a named group with a shared treasury and item pool.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `ownerUserId` | UUID | FK to `user`; creating user |
| `slug` | text | Unique URL-safe slug, indexed |
| `name` | text | Required display name |
| `description` | text | Optional |
| `passphraseHash` | text | Optional bcrypt hash for legacy-compatible access |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

### Party Members

| Field | Type | Notes |
|---|---|---|
| `partyId` | UUID | FK to `parties` |
| `userId` | UUID | FK to `user` |
| `role` | text | `owner` or `member` |
| `joinedAt` | timestamptz | |

Primary key: `(partyId, userId)`.

### Inventory History

History uses the same scope key for both owner types. The initial UI exposes party activity only, but
the model can record personal changes without another schema redesign.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `inventoryScopeId` | UUID | FK to `inventory_scopes` |
| `action` | text | `item_added`, `item_updated`, `item_removed`, `currency_updated` |
| `entityType` | text | `item` or `currency` |
| `entityId` | UUID | Nullable inventory item ID |
| `entityName` | text | Item-name snapshot when applicable |
| `details` | jsonb | Action-specific payload |
| `createdAt` | timestamptz | |

### Character-Party Link

Add optional `partyId` to `characters`. A character may belong to at most one party. The link grants
no access by itself; the current user must already be a party member.

## API

All routes use the current Better Auth session. Character routes verify character ownership; party
routes verify party membership. Inventory scope IDs are internal persistence identifiers and are not
accepted as public authorization boundaries.

### Personal Treasury

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/characters/:characterId/treasury` | Get personal balances and total value |
| `PUT` | `/api/characters/:characterId/treasury` | Add personal funds using a nonnegative currency delta |
| `POST` | `/api/characters/:characterId/treasury/spend` | Spend personal funds by subtracting total copper value and greedily normalizing the remaining balance, with insufficient-funds rejection |
| `POST` | `/api/characters/:characterId/treasury/convert` | Convert personal denominations |
| `POST` | `/api/characters/:characterId/treasury/preview/add` | Preview adding personal funds without changing balances |
| `POST` | `/api/characters/:characterId/treasury/preview/spend` | Preview spending personal funds and the normalized resulting balances without changing balances |

### Personal Inventory

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/characters/:characterId/items` | Add a personal item |
| `GET` | `/api/characters/:characterId/items` | List personal items with optional filters |
| `GET` | `/api/characters/:characterId/items/:itemId` | Get one personal item |
| `PATCH` | `/api/characters/:characterId/items/:itemId` | Update a personal item |
| `DELETE` | `/api/characters/:characterId/items/:itemId` | Remove a personal item |
| `POST` | `/api/characters/:characterId/items/:itemId/equip` | Equip an item |
| `POST` | `/api/characters/:characterId/items/:itemId/unequip` | Unequip an item |

### Party Management and Inventory

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/parties` | Create a party |
| `GET` | `/api/parties` | List parties for the current user |
| `GET` | `/api/parties/:partyId` | Get party detail, treasury, and members |
| `PUT` | `/api/parties/:partyId` | Update party name and description |
| `POST` | `/api/parties/:partyId/auth` | Verify passphrase and add the current user |
| `POST` | `/api/parties/:partyId/items` | Add a shared item |
| `GET` | `/api/parties/:partyId/items` | List shared items with optional filters |
| `GET` | `/api/parties/:partyId/items/:itemId` | Get one shared item |
| `PATCH` | `/api/parties/:partyId/items/:itemId` | Update a shared item |
| `DELETE` | `/api/parties/:partyId/items/:itemId` | Delete a shared item |
| `PUT` | `/api/parties/:partyId/treasury` | Apply a party currency delta |
| `POST` | `/api/parties/:partyId/treasury/convert` | Convert party denominations |
| `GET` | `/api/parties/:partyId/history` | List paginated party activity |
| `PUT` | `/api/characters/:characterId/party` | Set or clear a character's party link |

Catalogue-owned read routes support reusable item search and details:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/catalogue/items` | Search normalized SRD equipment with typed filters |
| `GET` | `/api/catalogue/items/:catalogueItemId` | Get normalized item details and provenance |
| `GET` | `/api/catalogue/status` | Report seeded capabilities, source revision, and counts |

Inventory create/update requests may include `catalogueItemId`. The server resolves that reference
through the catalogue service and snapshots normalized fields into the owned inventory item. Browser
code uses the generated catalogue client and does not call an external D&D data source directly.

## UX Requirements

### Treasury UI

The same treasury presentation is reused for personal and party scopes:

- PP, GP, SP, and CP balances with denomination-specific colors.
- Total GP value.
- Add funds and spend actions.
- Per-denomination inputs and a result preview.
- Automatic making-change and a clear insufficient-funds error.
- A visible scope label such as `Personal Treasury` or `Party Treasury`.

### Inventory UI

The same item presentation is reused for personal and party scopes:

- Lucide icons: `Sword`, `FlaskConical`, `ScrollText`, `Sparkles`, and `Package`.
- Distinct rarity border, background, text, and badge colors.
- Item cards with placeholder thumbnail, name, quantity, rarity, type, and key stats.
- Type filter tabs with counts and a debounced search input.
- Add item modal with SRD search and auto-fill.
- Edit modal, detail panel, and delete confirmation.
- A scope-specific empty state and call to action.

Personal items additionally show equip and unequip controls. Party items never appear equipped.

### Character Detail Composition

- Personal treasury and personal inventory appear without requiring a party.
- When linked, party treasury and shared items appear in a clearly separate section.
- Personal and party mutations use distinct actions and cannot silently move resources.
- Failure in the party section must not prevent personal character modules from rendering.

### Party Activity

- Show the most recent entry inline.
- Provide a paginated full-history view.
- Use action icons, readable descriptions, and timestamps.
- Record shared item and party currency changes, not personal character changes.

## Legacy Import

- Source: SQLite from the existing D&D Party Inventory Manager.
- Target: Postgres parties, party-owned inventory scopes, memberships, treasury, items, and history.
- Personal character treasuries and items are not populated from legacy data unless a future source
  contains explicit character ownership.
- Configure an owner user ID or import parties as claimable records according to the runbook.
- Convert legacy IDs deterministically or retain them in indexed `legacyId` columns.
- Use natural/source keys for idempotent re-runs.
- Reconcile party count, item count, history count, and currency totals.

## Non-Goals for Initial Merge

- Moving currency or items between personal and party scopes.
- Personal inventory or treasury activity history UI.
- AI thumbnail generation.
- Real-time collaborative editing.
- Applying equipped item modifiers to character stats.
- Attunement limits or equipment slots.
- Monster or encounter catalogue ingestion.
- A universal catalogue table that replaces typed spell and item projections.

## Product Decisions

- Character-first delivery is mandatory: personal treasury ships before personal inventory, and both
  ship before party management.
- Character and party owners use the same `inventory_scopes` model through explicit owner foreign
  keys and an exactly-one-owner constraint.
- Treasury, item, and history records reference `inventoryScopeId`; they do not duplicate character
  and party storage models.
- Character and party treasuries use the same denomination and making-change rules while remaining
  separate because they resolve to different inventory scopes.
- Public APIs remain owner-oriented so authorization is checked before resolving an inventory scope.
- D&D source integrations remain inside the catalogue domain; inventory consumes normalized item
  capabilities and stores owned snapshots.
- Foundry `dnd5e` is the local SRD 2024 seed source for both spells and items, pinned to a reproducible
  source revision before equipment ingestion is released.
- Linking a character to a party does not transfer, copy, or merge resources.
- Primary access uses Better Auth sessions. Legacy slug/passphrase access only adds the current user
  as a party member.
- The item type and rarity enums remain compatible with the legacy inventory manager.
