# Character Creation MVP Product Spec

Last verified: 2026-05-31

Status: Draft

## Summary

The first product slice lets a player create a minimal D&D 5e character, see that character in a
roster, and open a dedicated detail page for that character. Characters are scoped to an automatic
browser session through a server-owned session cookie; visible accounts can be layered in later.

This slice intentionally stores only user-entered identity data: name, class, and level. It does not
try to calculate rules, generate character options, or model a full character sheet.

## User Outcome

A player can:

- Create a character with a name, class, and level.
- See all available characters in a list after creation.
- Click a character in the list and land on that character's detail page.
- Return from a detail page to the character list.

## Primary User Flow

1. The player opens the character area.
2. If no characters exist, the page shows an empty state and a clear way to create one.
3. The player opens the create-character form.
4. The player enters a character name, chooses a class, chooses a level, and submits the form.
5. The app persists the character and opens the new character's detail page.
6. The player can return to the character list and see the new character there.

## Functional Requirements

### Session Scope

- The app uses a browser-based session cookie to scope available characters.
- If no valid session exists, the server automatically creates an anonymous user/session.
- The session cookie must be HTTP-only and server-owned.
- User-visible sign-up, sign-in, account linking, and account management are separate future
  features.

### Character Data

- A character has a server-generated stable ID.
- A character has a required name.
- A character has a required class.
- A character has a required level.
- Name is trimmed before persistence.
- Name must be at least 1 character and at most 120 characters after trimming.
- Class must be selected from the fixed D&D 5e class dropdown: Barbarian, Bard, Cleric, Druid,
  Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, or Wizard.
- Level must be a whole number from 1 through 20.
- Duplicate character names are allowed; identity comes from the stable ID.
- Created and updated timestamps may be stored for ordering and future workflows, but they are not
  required to appear in the UI.

### Create Character

- The create form includes fields for name, class, and level.
- Name accepts plain text.
- Class is a single choice.
- Level defaults to 1.
- Submit is blocked when required fields are missing or invalid.
- Validation errors appear next to the relevant field.
- Failed persistence keeps the user's entered form values visible and shows a recoverable error.
- Successful creation opens the new character's detail page.

### Character List

- The list shows every available character in the current user/session scope.
- Each list item shows the character name, class, and level.
- The newest created character appears in the list after successful creation.
- Empty state copy should be brief and should include a create action.
- Loading and error states should be visible and recoverable.
- Clicking a list item opens that character's detail page.

### Character Detail

- The detail page is directly addressable by character ID.
- The page displays the character name, class, and level.
- The page includes a way back to the character list.
- The page may host separate feature modules, such as the
  [character health module](./character-health-mvp-spec.md), without expanding the character
  creation fields.
- If the character ID does not exist or is not available in the current scope, show a not-found state
  with a way back to the list.

## UX Requirements

- The first app screen after loading should make the character list and create action obvious.
- The workflow should be usable with a keyboard.
- Form controls must have visible labels.
- The UI should not explain D&D rules or class mechanics in this slice.
- Do not add a marketing landing page before the usable character workflow.

## Non-Goals

- Sign-up, sign-in, account management, or external auth provider flows.
- Editing a character after creation.
- Deleting or archiving characters.
- Race, background, subclass, ability scores, hit points, proficiencies, inventory, spells, or notes.
- Health tracking inside the create form; health tracking is a separate detail-page module.
- Rules validation beyond the level range and required fields.
- Character import/export.
- Campaign management.
- Multi-character comparison.

## Product Decisions

- This spec describes the character workflow only. Auth remains separate, but this slice assumes a
  browser-based session cookie and automatically created anonymous user/session.
- Class names are stored as user-facing labels, not as rules objects.
- The initial class picker uses core D&D 5e class names without including rules text, mechanics,
  descriptions, or sourcebook content.
- The character list sorts newest-first unless a later product decision changes it.
- Character names have a 120-character maximum.
- Successful creation navigates directly to the new character detail page.
- Future character sheet areas should be separate feature modules until their scope is explicit.

## Acceptance Criteria

- Given no characters exist, when the player opens the character list, then they see an empty state
  and a create action.
- Given valid name, class, and level values, when the player submits the create form, then the
  character is persisted and the app opens that character's detail page.
- Given the player returns to the list after creating a character, when the list loads, then the
  created character appears there.
- Given an invalid create form, when the player tries to submit it, then no character is persisted
  and field-level errors explain what needs to change.
- Given a character exists in the list, when the player clicks it, then the app opens a detail page
  for that exact character.
- Given the player reloads the browser after creating a character, when they open the list again,
  then the character is still present for the same browser session.
- Given a missing character ID, when the player opens that detail URL, then the app shows a not-found
  state with a path back to the list.
