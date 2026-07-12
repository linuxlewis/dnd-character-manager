# Character Level Editing Design

## Context

Players can create, list, and view D&D 5e characters with name, class, level, health, spell slots, and saved spell details. Character level is currently immutable after creation, but later workflows already use the level when applying D&D API spell slot defaults.

## Approved Approach

Implement level-only editing from the character detail page. A level edit updates the stored character level and refreshes visible character summary/detail state. It does not automatically update spell slot totals or saved spells. Manual spell slot configuration remains user-owned, and the existing apply-defaults action stays the explicit way to recalculate spell slot defaults for the current class and level.

This avoids overwriting manual slot edits and keeps the requested scope smaller than a general character editor.

## Architecture

- Types: add `UpdateCharacterLevelRequestSchema` with `level` constrained by the existing `CharacterLevelSchema`. Add an update response schema using the existing `CharacterDetailResponseSchema`.
- Repo: add a method that updates `characters.level` for a matching `userId` and `characterId`, updates `updated_at`, and reloads the parsed character detail through the existing mapper path.
- Service: add `updateCharacterLevel(userId, characterId, input)` and convert missing rows to `CharacterNotFoundError`.
- Runtime: add `PUT /api/characters/:characterId/level`, parse params and body at the boundary, return `400` for invalid level and `404` for missing or unowned characters, and register the route contract for OpenAPI/client generation.
- UI: add a compact level edit control to the character detail header near the current class/level badges. Use Mantine form helpers, local state, and the generated mutation helper. Do not use `useEffect`.

## Data Flow

1. The player opens a character detail page and chooses to edit level.
2. The UI opens a small edit form initialized from the loaded character level.
3. On submit, the UI sends `{ level }` to the generated `updateCharacterLevel` mutation.
4. On success, the detail query cache is updated with the returned character detail and the character list query is invalidated so list badges refresh.
5. `CharacterSpellSlotsPanel` receives the new level from the refreshed character detail, but existing slot totals remain unchanged until the player explicitly applies defaults.

## Errors

- Invalid level input shows the existing validation message: "Level must be a whole number from 1 to 20".
- Server-side invalid payloads return `400` without calling the service.
- Missing or cross-session characters return `404` and reuse the existing character not found response shape.
- Failed persistence keeps the edit form available and shows a recoverable alert.

## Testing

- Types unit test: update-level request accepts levels `1-20` and rejects invalid values.
- Service unit test: service forwards valid updates and throws `CharacterNotFoundError` when the repository cannot update/reload the character.
- Runtime unit test: route parses the update request, calls the service with current user scope, rejects invalid payloads, and maps not found to `404`.
- Runtime integration test: route persists the new level, returns refreshed detail, updates list output, and remains session-scoped.
- Contract/generated-client tests: operation ID and generated client names include `updateCharacterLevel`; regenerate OpenAPI and typed client artifacts.
- UI unit test: character detail shell includes the level edit affordance without using lifecycle effects.
- E2E test: create a character, edit level on the detail page, verify the detail badge updates, navigate back to the list, verify the list level updates, and verify the edited level persists across reload.

## Out Of Scope

- Editing name, class, max HP, spell slots, saved spells, or deletion as part of this workflow.
- Automatically applying D&D API spell slot defaults after a level edit.
- Adding character advancement rules, class-specific validations, or level-up automation.
