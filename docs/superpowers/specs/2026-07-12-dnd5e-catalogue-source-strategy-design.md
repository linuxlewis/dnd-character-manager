# D&D 5e Catalogue Source Strategy Design

Date: 2026-07-12

## Status

Approved direction: hybrid source strategy.

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

## Source Roles

### Open5e v2

Role: primary hosted catalogue source.

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
spells. Equipment should use Open5e v2 first so the app can deliver inventory/search behavior before
the local importer exists.

### Phase 3: Local Seeded Catalogue

Add an importer that reads Foundry `dnd5e` SRD 2024 packs and writes normalized catalogue records to
Postgres. Once local catalogue coverage is verified, runtime lookup can prefer local records and use
Open5e as a refresh/reference source rather than as the only runtime dependency.

## Error Handling

- External API failures should return catalogue-specific unavailable errors, not raw fetch/schema
  errors.
- Saved character references should continue to render from stored fields even if live detail lookup
  fails.
- Source-specific parsing must happen at the boundary with Zod schemas before records enter the
  catalogue domain.
- Import failures should identify the source file/key and fail the import batch before partial
  catalogue state is promoted.
- License/source attribution must be required on imported source batches.

## Testing Strategy

- Unit tests for source mappers:
  - Open5e spell/item/weapon/armor/magic-item responses.
  - Foundry `spells24` and `equipment24` YAML fixtures.
  - 5e-bits legacy spell/detail fallback.
- Integration tests for local catalogue persistence and search/detail routes.
- Contract tests for generated OpenAPI catalogue routes.
- E2E tests for user-visible catalogue workflows:
  - Spell search still finds SRD 2024 spells.
  - Equipment search returns mundane equipment and magic-item variants.
  - Saved spell details survive fallback behavior.
- A source-audit test or script should assert minimum expected SRD 2024 counts before generated
  source snapshots are accepted.

## Source Audit Requirements

Before considering the catalogue comprehensive, verify at least:

- SRD 2024 spells are present from Open5e and Foundry source packs.
- Mundane equipment is present, including weapons and armor.
- Magic items are represented distinctly from mundane equipment.
- Every imported record includes source name, source key/path, rules version, and license metadata.
- Existing 2014 saved spell/feature URLs remain parseable and displayable.

## Source References

- Official SRD 5.2.1: `https://www.dndbeyond.com/srd`
- Open5e API v2 root: `https://api.open5e.com/v2/`
- Open5e API docs: `https://open5e.com/api-docs`
- Open5e legal page: `https://open5e.com/legal`
- Foundry `dnd5e` repository: `https://github.com/foundryvtt/dnd5e`
- 5e-bits / dnd5eapi docs: `https://5e-bits.github.io/docs/`

## Open Questions For Implementation Planning

- Whether to snapshot Foundry/Open5e source data in the repo or fetch during a seed/import command.
- Whether local catalogue search should replace Open5e immediately after import or run behind a
  feature flag.
- How much Foundry activity/damage data to preserve in v1 versus storing source detail payloads for
  later rules automation.
- Whether equipment should become a new domain or a catalogue subdomain consumed by a future
  inventory domain.
