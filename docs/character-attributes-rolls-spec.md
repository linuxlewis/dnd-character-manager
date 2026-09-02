# Character Attributes, Proficiencies, And Roll Reference Product Spec

Last verified: 2026-09-01

Status: Proposed

## Summary

This feature adds the D&D 5e ability-score and proficiency layer to a character. A player can enter
the six ability scores, manage saving throw and skill proficiencies, and use a roll reference that
shows each calculated modifier and the sources that contribute to it.

The first release is a character-sheet cheat sheet, not a dice roller or full character builder. It
uses dependable user-entered values and a small set of explicit SRD 5.2.1 / 2024 calculations. It
does not infer choices from class, species, background, feats, equipment, or spells.

## Repository Context

This proposal follows the current implementation and recent pull-request direction:

- Character identity remains intentionally small. Health, spells, treasury, and inventory are
  separate modules on the character detail page rather than fields in the create-character form.
- PR #60 established that a level change updates the character without silently reconfiguring
  another module. This feature follows the same rule: changing level recalculates proficiency bonus
  but does not add, remove, or replace selected proficiencies.
- PRs #62 and #63 combined related character edits into a modal. Review of that flow identified the
  risk of partial saves across sequential endpoints, so one attribute/proficiency edit must be
  persisted atomically.
- PR #63 established server-owned derived character values for experience progress. Roll totals and
  bonus breakdowns should follow that pattern and be returned as parsed, derived response data.
- PRs #72 and #73 established character-scoped authorization, atomic mutations, and explicit cache
  reconciliation for independently owned character modules.
- The stacked personal-inventory work through PR #78 introduces tabs on the character detail page.
  This module should integrate as an `Attributes & Rolls` section inside the route-backed
  [character detail navigation and layout](./character-detail-navigation-design-spec.md), rather
  than extending the already dense character header.

## User Outcome

A player can:

- Set Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma scores.
- See the signed ability modifier calculated for every score.
- See the character's proficiency bonus calculated from character level.
- Mark saving throw proficiencies.
- Set each skill to no proficiency, half proficiency, proficiency, or expertise.
- See a searchable cheat sheet for ability checks, skills, saving throws, initiative, and passive
  Perception.
- Expand any calculated entry to see exactly which numeric bonuses produced its total.
- Refresh the page and see the same scores and proficiency choices.

## Rules Baseline

- The feature targets the repository's existing SRD 5.2.1 / D&D 2024 direction.
- Ability modifiers use `floor((score - 10) / 2)`.
- Ability scores are whole numbers from 1 through 30.
- Proficiency bonus is derived from character level:

| Character level | Proficiency bonus |
| --- | --- |
| 1-4 | +2 |
| 5-8 | +3 |
| 9-12 | +4 |
| 13-16 | +5 |
| 17-20 | +6 |

- Half proficiency contributes `floor(proficiencyBonus / 2)`.
- Proficiency contributes the proficiency bonus once.
- Expertise contributes twice the proficiency bonus.
- A saving throw supports `none` or `proficient` in the first release.
- A skill supports `none`, `half`, `proficient`, or `expertise` so players can represent common
  class features without requiring class automation.
- The app calculates modifiers only. It does not determine whether a roll succeeds because the DC,
  opposing roll, advantage state, and table rulings are contextual.

## Ability And Skill Mapping

| Ability | Skills |
| --- | --- |
| Strength | Athletics |
| Dexterity | Acrobatics, Sleight of Hand, Stealth |
| Intelligence | Arcana, History, Investigation, Nature, Religion |
| Wisdom | Animal Handling, Insight, Medicine, Perception, Survival |
| Charisma | Deception, Intimidation, Performance, Persuasion |
| Constitution | No standard skills |

The mapping is fixed application configuration for this rules baseline. The player cannot remap a
standard skill to a different ability in the first release.

## Primary User Flow

1. The player opens a character detail page with `Attributes & Rolls` active by default.
2. The page shows six ability scores, their modifiers, and the level-derived proficiency bonus.
3. The player opens `Edit attributes`.
4. The player changes one or more ability scores, saving throw proficiencies, or skill proficiency
   ranks.
5. The editor shows calculated modifier previews from the draft values.
6. The player saves once, and all changes are validated and persisted atomically.
7. The roll reference immediately reflects the saved totals.
8. The player expands a row such as `Stealth +7` and sees a breakdown such as
   `Dexterity +3` and `Expertise +4`.

## Functional Requirements

### Ability Scores

- Every character has exactly one score for each of the six abilities.
- New and existing characters start with all six scores set to 10 until the player changes them.
- Scores are stored values; modifiers are derived and are never persisted separately.
- The UI displays modifiers with an explicit sign, including `+0`.
- Invalid, empty, fractional, or out-of-range scores block submission and show field-level errors.
- Editing attributes is not added to character creation. It remains a separate detail-page module,
  consistent with health and inventory.

### Proficiency Bonus

- Proficiency bonus is derived only from the character's current level.
- A level update automatically changes all affected roll totals when the character is reloaded or
  the relevant query is invalidated.
- A level update never changes saved skill ranks or saving throw proficiency selections.
- The response includes the derived proficiency bonus so every client displays the server-approved
  value.

### Saving Throw Proficiencies

- The editor lists one saving throw for each ability.
- Each saving throw can be set to `none` or `proficient`.
- The total is `ability modifier + proficiency contribution`.
- Constitution saving throws provide the reference used for concentration checks, but the first
  release does not add a separate concentration row or automate spell concentration.

### Skill Proficiencies

- The editor lists all 18 standard skills grouped by their governing ability.
- Each skill has one rank: `none`, `half`, `proficient`, or `expertise`.
- A skill total is `governing ability modifier + proficiency contribution`.
- The UI uses explicit labels rather than relying only on icons or abbreviations.
- The app does not infer ranks from class, background, species, feats, or saved features.

### Roll Reference

- The roll reference includes these categories:
  - six generic ability checks;
  - 18 skill checks;
  - six saving throws;
  - initiative;
  - passive Perception.
- Initiative is `Dexterity modifier` in the first release.
- Passive Perception is `10 + Perception modifier`.
- Each row shows the roll name, governing ability, proficiency rank when applicable, and signed
  total.
- Each row can reveal an ordered numeric breakdown. Zero-value components remain visible when they
  explain the calculation.
- Example skill breakdown: `Stealth +7 = Dexterity +3 + Expertise +4`.
- Example save breakdown: `Wisdom save +5 = Wisdom +2 + Proficiency +3`.
- Example passive breakdown: `Passive Perception 15 = Base 10 + Perception +5`.
- Players can search the reference by roll, skill, or ability name.
- Filters allow the player to show all entries, checks, saving throws, or other values.
- Negative totals and negative components display with a minus sign and never use a double sign.
- Roll totals update after an attribute, proficiency, or character-level change without a full page
  reload.

### Editing And Failure Behavior

- The edit workflow is one form and one mutation for all scores and proficiencies.
- Saving is all-or-nothing. A validation or persistence failure leaves the previous saved state
  unchanged.
- A failed save keeps the draft values visible and shows a recoverable module-level error.
- Closing and reopening the editor resets stale errors and starts from the latest saved state.
- A no-op save closes the editor without issuing a mutation.
- The save action is disabled while a save is pending.

### Ownership And Authorization

- Attribute and proficiency records belong to one character.
- All reads and writes use the same session/user ownership checks as other character modules.
- A missing character and a character owned by another user both return the existing not-found
  behavior rather than revealing ownership information.
- Anonymous-to-account character transfer requires no special data move because these records
  remain linked through character ownership.

## Roll Bonus Breakdown Model

The API should return structured components rather than a preformatted formula string:

```ts
interface RollReferenceEntry {
	id: string;
	label: string;
	category: "ability-check" | "skill" | "saving-throw" | "initiative" | "passive";
	ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
	proficiencyRank: "none" | "half" | "proficient" | "expertise" | null;
	total: number;
	components: Array<{
		type: "base" | "ability" | "proficiency";
		label: string;
		value: number;
	}>;
}
```

The exact TypeScript organization may change during implementation, but the response must preserve
these semantics. The UI owns presentation; the service owns the accepted calculation.

## Data Model

### `character_attributes`

| Column | Shape | Notes |
| --- | --- | --- |
| `character_id` | UUID primary key | Foreign key to `characters`, cascade on delete |
| `strength` | integer | 1-30, default 10 |
| `dexterity` | integer | 1-30, default 10 |
| `constitution` | integer | 1-30, default 10 |
| `intelligence` | integer | 1-30, default 10 |
| `wisdom` | integer | 1-30, default 10 |
| `charisma` | integer | 1-30, default 10 |
| `created_at` | timestamp | Server owned |
| `updated_at` | timestamp | Updated on successful mutation |

### `character_proficiencies`

| Column | Shape | Notes |
| --- | --- | --- |
| `character_id` | UUID | Foreign key to `characters`, cascade on delete |
| `category` | text | `skill` or `saving-throw` |
| `key` | text | Parsed ability or skill key |
| `rank` | text | Parsed rank allowed for the category |
| `created_at` | timestamp | Server owned |
| `updated_at` | timestamp | Updated on successful mutation |

- The primary key is `(character_id, category, key)`.
- Rows with rank `none` are omitted. The domain response materializes the complete fixed set.
- Database constraints should reject unsupported categories and ranks where practical; Zod parsing
  remains required at repository boundaries.
- The migration inserts one default `character_attributes` row for every existing character.
- Character creation inserts the default attribute row in the same transaction that creates the
  character and initial health record.

## API Shape

The module should be independently loadable, following spell slots, treasury, and inventory:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/characters/:characterId/attributes` | Load scores, proficiencies, derived modifiers, and roll reference |
| `PUT` | `/api/characters/:characterId/attributes` | Atomically replace scores and roll-affecting proficiency selections |

The update request contains all six scores plus the complete saving throw and skill selections. The
response uses the same schema as the GET response. Route contracts generate the OpenAPI document,
typed client, query options, mutation options, and query keys used by the UI.

The character-level mutation remains separate. On success, the UI invalidates both character detail
and character attributes because level changes proficiency bonus and derived totals.

## UI Requirements

- Follow the responsive shell, route-backed subnavigation, and Attributes wireframes in the
  [character detail navigation and layout spec](./character-detail-navigation-design-spec.md).
- Add `Attributes & Rolls` as the default primary character section alongside
  `Spells & Abilities` and `Inventory`.
- Show an aligned six-score reference list in the desktop side column and a compact two-column
  matrix on narrow screens.
- Each ability entry shows the ability name, score, and clearly aligned signed modifier without
  turning every value into a large dashboard card.
- Show proficiency bonus near the ability grid with copy that makes its level-derived nature clear.
- Keep editing in a modal or drawer so the saved cheat sheet remains easy to scan.
- Use Mantine form helpers. The six-score form may use controlled mode; use uncontrolled mode if the
  combined proficiency controls produce noticeable per-keystroke rendering cost.
- Do not use `useEffect`. Reset drafts in open/close handlers and update server state through
  generated TanStack Query helpers.
- Roll reference rows must remain usable by keyboard and expose expanded calculation text to screen
  readers.
- Do not encode proficiency only by color. Include text such as `Proficient` or `Expertise`.

## Architecture Requirements

- Keep the implementation in the existing `characters` domain because the data and calculations
  belong directly to a character and require no catalogue source.
- Follow `Types -> Config -> Repo -> Service -> Runtime -> UI`.
- Put ability keys, skill keys, proficiency ranks, schemas, and pure calculation helpers in
  `types/`.
- Put the fixed skill-to-ability mapping and level-to-proficiency table in client-safe `config/` or
  in pure types-layer constants, following the dependency linter's allowed direction.
- Parse database rows, route input, and response data with Zod before they enter the next layer.
- Derive roll totals in a pure function shared by service tests and client-side draft previews. The
  server response remains authoritative after save.
- Use provider-backed database and telemetry access. Do not log raw form payloads.

## Implementation Stack Outline

This A0 specification is the baseline for a later native stack. The implementation layers below are
owned by the attributes-and-rolls stack; the `A1-A7` package names in the inventory documentation
refer to a different feature and must not be reused for these responsibilities.

| Layer | Responsibility | Expected boundary |
| --- | --- | --- |
| A0: Spec | Product, rules, navigation, data, API, UX, and acceptance baseline | This document plus the [character detail navigation and layout spec](./character-detail-navigation-design-spec.md) |
| A1: Types | Ability keys, skill keys, proficiency ranks, request/response schemas, and pure modifier/roll calculations | `src/domains/characters/types/`; no database, HTTP, or UI imports |
| A2: Config | Fixed skill-to-ability mapping, ordered skill/ability lists, and level-to-proficiency table | `src/domains/characters/config/`; client-safe constants only |
| A3: Repo | Attribute/proficiency tables, Zod-safe row mappers, default backfill, character-creation initialization, and atomic replacement | `src/domains/characters/repo/`; database access through providers |
| A4: Service | Ownership checks, complete-state validation, authoritative derived response construction, and no-op/atomic mutation rules | `src/domains/characters/service/`; injected repository and character-service collaboration |
| A5: Runtime | GET/PUT route contracts, handlers, error mapping, contract registration, and generated API/client refresh | `src/domains/characters/runtime/`, `src/api-contracts.ts`, and generated artifacts |
| A6: UI | URL-backed three-section shell, persistent ribbon, Attributes & Rolls reference, atomic editor, query/mutation reconciliation, and responsive/accessibility behavior | `src/domains/characters/ui/`; generated TanStack Query helpers only |
| A7: Verification | Co-located unit/integration/contract tests and one focused browser journey covering persistence, level changes, failure retention, navigation, and ownership | Tests follow the layer they verify; e2e coverage lives under `tests/e2e/` |

The dependency path is `A1 -> A2 -> A3 -> A4 -> A5 -> A6`, with A7 validating each completed
boundary. A2 may remain a small config addition or be folded into A1 if the dependency linter and
client-safe sharing make that the clearer ownership; it must not move database or route concerns into
the types layer. A5 owns generated artifacts, so no generated file should be hand-edited. A6 must
invalidate or reconcile both the character-detail query and attributes query after a character level
mutation because proficiency bonus is derived from level.

## Testing Requirements

### Unit

- Ability score schema accepts 1 and 30 and rejects empty, fractional, and out-of-range values.
- Ability modifiers cover odd values, even values, negative modifiers, and the 1/30 boundaries.
- Proficiency bonus covers every level boundary: 1, 4, 5, 8, 9, 12, 13, 16, 17, and 20.
- Half proficiency rounds down; expertise doubles proficiency.
- All 18 skills map to the expected ability.
- Roll calculations cover no proficiency, half proficiency, proficiency, expertise, negative
  ability modifiers, saving throws, initiative, and passive Perception.
- Duplicate or invalid proficiency keys are rejected.
- UI tests cover signed formatting, expanded breakdowns, filters, draft preview, failure retention,
  and stale-error reset.

### Integration And Runtime

- Existing-character backfill produces six scores of 10.
- Character creation atomically initializes health and attributes.
- Repository reads parse stored scores and proficiency rows.
- Atomic replacement cannot leave partially updated scores or proficiencies.
- Character ownership isolates reads and writes.
- A level change changes derived proficiency bonus without changing stored proficiency rows.
- Route and generated-client contract tests cover GET, PUT, validation failure, and not found.

### End To End

One focused browser journey should prove that a player can:

1. Create a level 1 character.
2. Confirm `Attributes & Rolls` is active and shows six scores of 10, modifiers of `+0`, and
   proficiency bonus `+2`.
3. Set Dexterity to 16, Wisdom to 14, Stealth to expertise, Perception to proficient, and Wisdom
   saving throw to proficient.
4. See `Stealth +7`, `Perception +4`, `Wisdom save +4`, initiative `+3`, and passive Perception `14`.
5. Expand Stealth and see `Dexterity +3` plus `Expertise +4`.
6. Refresh and see the same saved state.
7. Change the character to level 5 and see proficiency bonus `+3`, Stealth `+9`, Perception `+5`,
   Wisdom save `+5`, and passive Perception `15` without reselecting proficiencies.

The journey should also exercise one visible invalid-score error and confirm another user's
character attributes are not accessible.

## Acceptance Criteria

- Given a character has default attributes, when the player opens the module, then all six scores
  are 10 and all modifiers are `+0`.
- Given an ability score changes, when the player previews or saves the edit, then every dependent
  roll displays the new ability contribution.
- Given a skill rank changes, when the edit is saved, then the skill total and breakdown use the
  correct proficiency contribution.
- Given a saving throw is proficient, when the reference renders, then its breakdown includes the
  governing ability modifier and one proficiency bonus.
- Given the character level crosses a proficiency boundary, when character state refreshes, then all
  affected totals change and the selected proficiencies remain unchanged.
- Given any update field is invalid or persistence fails, when the player saves, then none of the
  submitted changes become the saved state.
- Given a player expands a roll, then every numeric component contributing to the displayed total is
  visible and the components sum to that total.
- Given the player reloads the page, then saved scores and proficiencies persist.

## Non-Goals For The First Release

- Rolling dice, random-number generation, roll history, or sending rolls to a virtual tabletop.
- Advantage, disadvantage, inspiration, exhaustion, temporary effects, or conditional roll notes.
- User-defined numeric bonus sources or arbitrary custom roll formulas.
- Attack rolls, damage rolls, spell attack modifiers, spell save DC, weapon mastery, or weapon
  proficiency automation.
- Tool, armor, weapon, vehicle, gaming set, or language proficiency management.
- Class-, background-, species-, feat-, spell-, or equipment-derived proficiency selection.
- Alternative skill abilities, such as a Strength (Intimidation) ruling.
- Multiclassing, proficiency overrides, or rules-version switching per character.
- Importing a complete rules compendium or explanatory rules text.

## Follow-Up Opportunities

- Named manual modifiers and roll notes with explicit scopes, such as `all saving throws` or
  `Stealth`, so item and feature effects can appear in the same breakdown.
- Advantage/disadvantage reminders without automatically resolving stacking or cancellation.
- Tool and weapon proficiency reference after inventory has typed weapon/tool mechanics.
- Spellcasting ability, spell attack modifier, and spell save DC after spellcasting configuration is
  explicitly modeled.
- Click-to-roll and roll history as a separate feature that consumes the reference calculations.
- Rules-version selection if the application later supports complete 2014 and 2024 character rules
  side by side.

## Product Decisions

- Use D&D terminology in the UI: `Ability Scores`, `Skills`, `Saving Throws`, and `Roll Reference`.
  `Attributes & Rolls` is the full section label and `Rolls` is its compact mobile label.
- Default scores to 10 for backward-compatible neutral modifiers; do not guess values from class.
- Keep the create-character flow small and configure attributes after creation.
- Treat roll calculations as transparent derived data, not opaque formatted strings.
- Ship the cheat sheet before a dice roller or custom effect engine.
- Keep standard mappings fixed for the 2024 baseline and defer table-specific variants.
