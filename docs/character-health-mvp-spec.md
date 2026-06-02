# Character Health MVP Product Spec

Last verified: 2026-05-31

Status: Draft

## Summary

The character health module lets a player track a simple current-health counter on a character
detail page. The player can set health, add to it, subtract from it, and review a history of health
changes.

This module is deliberately separate from character creation. It does not attempt to implement full
D&D hit point rules.

## User Outcome

A player can:

- Open a character detail page and see that character's current health.
- Set the character's health to a specific value.
- Add health when the character heals.
- Subtract health when the character takes damage.
- See a readable history of health changes.

## Primary User Flow

1. The player opens an existing character detail page.
2. The player finds the health module on the detail page.
3. If health has not been set, the module prompts for an initial health value.
4. The player sets health and sees the current health value update.
5. The player adds or subtracts a whole-number amount.
6. The module updates the current health and records the change in the history.
7. The player can refresh the page and still see the current health and prior changes.

## Functional Requirements

### Health State

- Health belongs to one character.
- Health is scoped to the same browser session/user ownership model as the character.
- A character may start with no health value set.
- Current health is a whole number.
- Current health cannot be lower than 0.
- The initial simple counter does not require maximum health.
- Setting health replaces the current health value.
- Adding health increases the current health value.
- Subtracting health decreases the current health value and floors at 0.

### Health Controls

- The module includes a set-health control.
- The module includes an add-health control.
- The module includes a subtract-health control.
- The set-health control accepts whole numbers greater than or equal to 0.
- Add and subtract controls accept whole numbers greater than 0.
- Add and subtract controls require health to be set first.
- Add and subtract controls should not accept empty, zero, negative, fractional, or non-numeric
  values.
- Validation errors appear next to the relevant control.
- Failed persistence keeps the user's entered value visible and shows a recoverable error.

### Health History

- Every successful set, add, and subtract action creates a history entry.
- Each history entry records the action type, change amount, resulting health value, and timestamp.
- Set-health history entries record the resulting health value even when there is no previous value.
- The UI shows the newest history entries first.
- The UI includes enough context for the player to understand what changed, for example "Set to 12",
  "Added 4", or "Subtracted 7".
- History is read-only in this slice.

### Character Detail Integration

- The health module appears on the character detail page.
- The module should not block rendering of the character's name, class, and level.
- If the health module fails to load, the detail page still displays the character identity fields
  and shows a recoverable module-level error.

## UX Requirements

- The current health value should be visually prominent inside the module.
- The three actions should be easy to distinguish: set, add, and subtract.
- The player should be able to complete health changes with a keyboard.
- History should be visible without navigating away from the character detail page.
- The module should stay compact enough to coexist with future character-detail modules.

## Non-Goals

- Maximum hit points.
- Temporary hit points.
- Death saves.
- Damage types, resistances, vulnerabilities, or immunities.
- Healing rules, rest automation, or class feature automation.
- Undo, edit, or delete history entries.
- Cross-character health dashboards.
- Showing health in the character list.

## Product Decisions

- Health is implemented as a separate module on the character detail page.
- Health starts unset until the player explicitly sets it.
- The first version tracks current health only.
- Subtracting more than the current health sets current health to 0.
- Health history is append-only for this slice.

## Acceptance Criteria

- Given a character has no health set, when the player opens the detail page, then the health module
  shows an unset state and a way to set health.
- Given the player enters a valid health value, when they submit set health, then current health
  updates and a set-history entry appears.
- Given current health is set, when the player adds a valid amount, then current health increases and
  an add-history entry appears.
- Given current health is set, when the player subtracts a valid amount, then current health
  decreases and a subtract-history entry appears.
- Given the player subtracts more than the current health, when the change succeeds, then current
  health is 0 and the history shows the subtract action.
- Given the player reloads the detail page, when the health module loads, then current health and
  history are still present for that character.
- Given an invalid amount, when the player submits a health action, then no health change is
  persisted and the relevant validation error appears.
