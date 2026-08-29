# D&D 5e Catalogue Source Strategy Design

Date: 2026-07-12

## Status

Approved direction: hybrid source strategy. Equipment sequencing updated 2026-08-29.

## Current Implementation Status

As of 2026-08-29, the repository has a `catalogue` domain, a local `catalogue_spells` Postgres table,
and a manual `pnpm seed` flow that downloads and ingests Foundry `dnd5e` `spells24` records. Character
spell lookup prefers the local catalogue when it is seeded and retains Open5e/5e-bits fallback
behavior. The Foundry source is pinned to commit
`f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6` from
`https://github.com/foundryvtt/dnd5e`; that revision contains both `packs/_source/spells24/` and
`packs/_source/equipment24/`. Equipment is not yet ingested. Source revision and configured pack
identity are reported by the catalogue seed manifest; no migration persists the revision in the
existing spell row. The manifest records the verified repository MIT license separately from each
record's `system.source.license`; an absent per-record content license remains an empty value and is
never inferred from the repository license.

The inventory implementation will extend the same catalogue boundary with typed equipment ingestion.
Foundry `dnd5e` at a pinned tag or commit is the primary local dataset for both spells and items.
Open5e remains an optional catalogue-owned fallback/reference source; inventory and character domains
must not call it directly.

For the personal inventory baseline, A1-A7 own inventory types, persistence, services, runtime, and
UI, while C1-C2 own the third-party catalogue boundary and typed equipment capability. M1 Personal
Treasury precedes M2 Personal Inventory; the package dependency and manual/e2e gates are defined in
the [execution plan](../../party-inventory-merge-plan.md) and [milestones](../../party-inventory-milestones.md).

This document defines the source strategy for making the app's D&D 5e spells and equipment
catalogue comprehensive for legally redistributable SRD 5.2.1 / 2024 content. It is a design
artifact only; implementation planning follows after review.

## Goals

- Provide comprehensive SRD 5.2.1 / 2024 spell and equipment coverage for app features.
- Prefer versioned, legally redistributable sources that can be cited and revalidated.
- Keep the current Open5e-backed spell workflow working while expanding toward equipment.
- Allow future local catalogue seeding/caching without requiring the app to depend on a third-party
  API at runtime.
- Preserve existing saved spell compatibility for `/api/2014/...` and `/api/2024/...` references.

## Non-Goals

- Do not ship non-SRD official D&D book content in the hosted database.
- Do not scrape D&D Beyond, Roll20, or other sources that do not provide redistributable data for
  this use.
- Do not design a full character-builder rules engine in this source strategy.
- Do not replace current saved character spell behavior during the source-strategy phase.
- Do not broaden the inventory-triggered equipment work into monsters, encounters, or a general
  rules engine.

## Source Roles

### Open5e v2

Role: hosted compatibility, fallback, and reference source.

Use Open5e v2 for online spell and equipment search/detail while the app still depends on external
lookups. The app already uses Open5e v2 for SRD 2024 spell search and spell details. The Open5e
source is version-addressable through `document__key__in=srd-2024` and exposes app-friendly REST
records for spells, items, weapons, armor, and magic items.

Verified live coverage on 2026-07-12:

| Endpoint | SRD 2024 count |
|----------|----------------|
| `/v2/spells/?document__key__in=srd-2024` | 339 |
| `/v2/items/?document__key__in=srd-2024` | 203 |
| `/v2/weapons/?document__key__in=srd-2024` | 38 |
| `/v2/armor/?document__key__in=srd-2024` | 13 |
| `/v2/magicitems/?document__key__in=srd-2024` | 757 |

### Foundry `dnd5e` System Packs

Role: richest local seed/import source.

Use Foundry `dnd5e` SRD 2024 source packs for a normalized local catalogue. Foundry records are more
mechanics-rich than Open5e records and include per-item rule-version/license metadata, but they are
Foundry-shaped YAML documents and need an importer/mapping layer before app use.

Verified live coverage on 2026-07-12:

| Pack path | Document count |
|-----------|----------------|
| `packs/_source/spells24/` | 341 |
| `packs/_source/equipment24/` | 633 |

### Official SRD 5.2.1

Role: legal baseline and source-of-truth reference.

Use the official SRD 5.2.1 as the content baseline for what the app may ship by default. The app
should store source attribution and license metadata so generated catalogue records remain traceable
to this baseline.

### 5e-bits / dnd5eapi

Role: legacy compatibility and secondary API reference.

Keep 5e-bits / dnd5eapi support for existing saved spell details and spell-slot defaults. It should
not be the primary 2024 spell catalogue source because the live `/api/2024` REST index currently
contains equipment and magic items but no `spells` key, and `/api/2024/spells` returns 404.

## Architecture

Introduce a catalogue boundary separate from the character domain when implementation begins.

```text
Catalogue Types -> Catalogue Config -> Catalogue Repo -> Catalogue Service -> Runtime -> UI
```

The character domain should consume catalogue APIs through service interfaces rather than importing
Open5e, Foundry, or 5e-bits clients directly. This keeps character workflows stable while catalogue
source strategy evolves.

Recommended catalogue concepts:

- `CatalogueSource`: `open5e`, `foundry-dnd5e`, `official-srd`, `dnd5eapi-legacy`.
- `RulesVersion`: `2014`, `2024`.
- `CatalogueEntryType`: `spell`, `item`, `weapon`, `armor`, `magic-item`.
- `CatalogueEntry`: normalized app record with source attribution, version, key, name, description,
  tags/categories, and detail payload.
- `SpellCatalogueEntry`: spell-specific fields such as level, school, casting time, range,
  components, duration, concentration, ritual, classes, scaling, and damage metadata where available.
- `EquipmentCatalogueEntry`: equipment-specific fields such as category, cost, weight, armor class,
  weapon damage, weapon properties, mastery property, rarity, attunement, and source item reference.

## Data Flow

### Phase 1: Current External Lookup Compatibility

Keep current spell lookup behavior:

1. Search SRD 2024 spells through Open5e v2.
2. Save normalized spell references to character records.
3. Resolve saved spell details through Open5e v2.
4. Fall back to 5e-bits 2014 REST for legacy saved spell or feature references.

### Phase 2: Catalogue API Expansion

Add catalogue-owned routes and clients for equipment search/detail without tying them to character
spells. Equipment should be normalized from the Foundry `equipment24` pack into local Postgres using
the same pinned source revision and provenance conventions as spells. Remote fallback may remain
behind the catalogue service, but it is not the inventory domain's data boundary.

### Phase 3: Local Seeded Catalogue

Add a seed command that downloads Foundry `dnd5e` SRD 2024 source data, processes the relevant
source packs, and writes normalized catalogue records to Postgres. Once local spell catalogue
coverage is verified, runtime spell lookup should prefer local records and use Open5e as a
refresh/reference source rather than as the only runtime dependency. No feature flag is needed for
the local-catalogue preference once the seed/import path is verified.

Local spell search should still fall back to the remote client when a seeded catalogue returns no
matches. The Foundry `spells24` pack currently seeds 340 spell records and includes Divine Smite,
Searing Smite, and Shining Smite, but not Wrathful Smite or Staggering Smite; those spells require
another redistributable source before the app can surface them.

The existing spell-first implementation pass remains stable and must not change saved-spell behavior.
The inventory release then activates the typed equipment extension through two catalogue-owned
packages: C1 establishes the third-party source boundary, explicit Foundry pin, provenance, and
fallback rules; C2 imports the pinned `equipment24` pack into typed local records and exposes
catalogue-owned search/detail and readiness/status APIs. M2 Personal Inventory cannot ship until
those C1/C2 requirements and the A5-A7 personal inventory packages pass their manual and e2e gates.

## Error Handling

- External API failures should return catalogue-specific unavailable errors, not raw fetch/schema
  errors.
- Saved character references should continue to render from stored fields even if live detail lookup
  fails.
- Source-specific parsing must happen at the boundary with Zod schemas before records enter the
  catalogue domain.
- Import failures should identify the source file/key and fail the import batch before partial
  catalogue state is promoted.
- License/source attribution should be preserved on imported source batches. Some Foundry records do
  not include `system.source.license`; keep the raw source payload and store an empty normalized
  license for those records rather than inventing a license value.

## Testing Strategy

- Unit tests for source mappers:
  - Open5e spell responses.
  - Foundry `spells24` YAML fixtures.
  - 5e-bits legacy spell/detail fallback.
- Integration tests for local catalogue persistence and search/detail routes.
- Contract tests for generated OpenAPI catalogue routes.
- E2E tests for user-visible catalogue workflows:
  - Spell search still finds SRD 2024 spells.
  - Saved spell details survive fallback behavior.
- Equipment mapper, route, and e2e tests should be added when equipment import/search is pulled into
  implementation scope; for M2, that scope includes typed Foundry `equipment24` ingestion, source
  audit counts, and unavailable/not-seeded status behavior.
- A source-audit test or script should assert minimum expected SRD 2024 counts before generated
  source snapshots are accepted.

## Source Audit Requirements

Before considering the catalogue comprehensive, verify at least:

- SRD 2024 spells are present from Open5e and Foundry source packs.
- Mundane equipment is present, including weapons and armor.
- Magic items are represented distinctly from mundane equipment.
- Every imported record includes source name, source key/path, rules version, and preserved license
  metadata when present.
- Existing 2014 saved spell/feature URLs remain parseable and displayable.

## Implementation Decisions

- Foundry data should be loaded through a seed command that downloads and processes source data,
  rather than by committing source snapshots directly as the primary workflow.
- Runtime spell lookup should move to the seeded local catalogue after the seed/import path is
  verified; no feature flag is needed for that switch. Remote fallback should remain for unseeded
  catalogues and local source gaps.
- Preserve as much Foundry source detail as possible. Normalized app fields should cover the current
  UI needs, and the importer should retain source detail payloads needed for future rules
  automation.
- Equipment was intentionally omitted from the first spell-only implementation pass. M2 now activates
  that documented extension through C1/C2 typed catalogue boundaries, item persistence, and APIs;
  monster and broader rules-data ingestion remain future work.

## Source References

- Official SRD 5.2.1: `https://www.dndbeyond.com/srd`
- Open5e API v2 root: `https://api.open5e.com/v2/`
- Open5e API docs: `https://open5e.com/api-docs`
- Open5e legal page: `https://open5e.com/legal`
- Foundry `dnd5e` repository: `https://github.com/foundryvtt/dnd5e`
- 5e-bits / dnd5eapi docs: `https://5e-bits.github.io/docs/`
