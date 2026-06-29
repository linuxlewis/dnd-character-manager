# Character Health MVP Product Spec

Last verified: 2026-06-02

Status: Draft

## Summary

The character health module lets a player track current HP, max HP, temporary HP, and recent HP
changes on a character detail page. The module shows a color-coded health bar and editable HP fields
that save on blur or Enter.

This module is deliberately separate from character identity data. It does not attempt to implement
full D&D hit point rules.

## User Outcome

A player can:

- Open a character detail page and see that character's current health.
- Edit current HP, max HP, and temporary HP.
- See temporary HP indicated separately from base max HP.
- See a color-coded health bar.
- See the last five health changes as readable HP diffs.
- Refresh the page and still see the latest health state and recent changes.

## Primary User Flow

1. The player opens an existing character detail page.
2. The player finds the health module on the detail page.
3. The module shows current HP, effective max HP, temporary HP, and a color-coded health bar.
4. The player edits current HP, max HP, or temporary HP.
5. The edit saves on blur or Enter.
6. The module updates the visible health values and records a diff history entry.
7. The player can refresh the page and still see the current health and recent changes.

## Functional Requirements

### Health State

- Health belongs to one character.
- Health is scoped to the same browser session/user ownership model as the character.
- A character starts with health initialized during character creation.
- `currentHp`, `maxHp`, and `temporaryHp` are stored values.
- `effectiveMaxHp` is derived as `maxHp + temporaryHp`.
- `currentHp`, `maxHp`, and `temporaryHp` are whole numbers.
- `currentHp` cannot be lower than 0.
- `maxHp` cannot be lower than 1.
- `temporaryHp` cannot be lower than 0.
- `currentHp` cannot be higher than `effectiveMaxHp`.
- Lowering max HP below current HP clamps current HP down.
- Increasing max HP increases current HP by the same delta, preserving the current missing HP.
- Increasing temporary HP increases current HP by the same delta.
- Decreasing temporary HP only clamps current HP if current HP is above the new effective max HP.

### Health Controls

- The module includes heal and damage actions for current HP.
- Heal and damage actions open amount dialogs and save on submit.
- Direct editing is available through an edit dialog for max HP and temporary HP.
- Inputs reject empty, negative, fractional, and non-numeric values.
- Heal and damage changes are clamped to `0..effectiveMaxHp`.
- Max HP edits require a whole number greater than or equal to 1.
- Temporary HP edits require a whole number greater than or equal to 0.
- Successful persistence resets transient input state to the latest saved value.
- Failed persistence keeps the user's entered value visible and shows a recoverable module-level
  error.

### Health Bar

- The health bar uses `currentHp / effectiveMaxHp`.
- Fully healed and healthy states are green.
- Mid-health states use yellow and orange.
- Low health states are red.
- Temporary HP is displayed next to the HP fraction in parentheses.

### Health History

- Every successful normalized health change creates a history entry.
- No history entry is created when the normalized health state is unchanged.
- Each history entry records the previous health, next health, current HP delta, max HP delta,
  temporary HP delta, and timestamp.
- The UI shows the newest history entries first when the history section is expanded.
- The UI shows the last five history entries behind a click-to-expand history control.
- History is read-only in this slice.

### Character Detail Integration

- The health module appears on the character detail page.
- The character detail GET response includes health and recent health changes.
- The module should not block rendering of the character's name, class, and level.
- If the health module fails to load, the detail page still displays the character identity fields
  and shows a recoverable module-level error.

## UX Requirements

- The current health value should be visually prominent inside the module.
- The player should be able to complete health changes with a keyboard.
- History should be visible without navigating away from the character detail page.
- The module should stay compact enough to coexist with future character-detail modules.

## Non-Goals

- Zero-HP status.
- Death saves.
- Damage types, resistances, vulnerabilities, or immunities.
- Healing rules, rest automation, or class feature automation.
- Undo, edit, or delete history entries.
- Cross-character health dashboards.
- Showing health in the character list.
- Rules-derived maximum HP.

## Product Decisions

- Health is implemented as a separate module on the character detail page.
- Health starts initialized from the character creation default max HP value.
- Temporary HP is stored separately but contributes to effective max HP.
- Increasing temporary HP also increases current HP by the same amount.
- Decreasing temporary HP does not reduce current HP except by clamping to effective max HP.
- Health history is append-only for this slice.
- There is no separate health GET endpoint in the MVP; character detail carries the health state.

## API

- `GET /api/characters/:characterId` returns character identity, health, and recent health changes.
- `PUT /api/characters/:characterId/health` accepts `currentHp`, `maxHp`, and `temporaryHp`.
- The health mutation returns:
  - `health`
  - `recentHealthChanges`

## Acceptance Criteria

- Given a newly created character, when the player opens the detail page, then current HP equals max
  HP and temporary HP is 0.
- Given the player edits current HP to a valid value and leaves the field, then current HP updates
  and a diff-history entry appears.
- Given the player increases temporary HP, then current HP and effective max HP both increase by the
  temporary HP delta.
- Given the player decreases temporary HP, then current HP is only reduced if it must be clamped to
  the new effective max HP.
- Given the player lowers max HP below current HP, then current HP is clamped down and the history
  shows the HP and max HP deltas.
- Given the player reloads the detail page, when the health module loads, then current health and the
  last five health changes are still present for that character.
- Given an invalid health value, when the player leaves the field or presses Enter, then no health
  change is persisted and the control prevents submission or shows a recoverable error.
