# Character and Party Inventory Milestones

Last verified: 2026-08-29

Status: Draft

These milestones pair with the [execution plan](./party-inventory-merge-plan.md). They are ordered
around complete user functionality: expand individual characters first, then introduce parties.
Every milestone must be deployable, manually testable, and protected by focused automated coverage.
Character and party milestones exercise the same underlying inventory scope, treasury, item, and
history models through different ownership and authorization paths.

M1 Personal Treasury is the A1-A4 character release. M2 Personal Inventory is the next character
release and combines C1-C2 catalogue work with A5-A7 inventory work. C1 and C2 must keep all
third-party catalogue access inside the catalogue domain; M2 exposes only the generated, typed
catalogue API to the browser and inventory services.

This baseline PR covers M1 and M2 only. M3-M8 and their A8-A17 packages are retained as a future
party roadmap and do not block the personal treasury or personal inventory release.

## Milestone Overview

| Milestone | User-visible outcome | Packages | Automated acceptance |
|---|---|---|---|
| M1 Personal Treasury | Each character has independent PP/GP/SP/CP balances | A1-A4 | `character-treasury.spec.ts` |
| M2 Personal Inventory | Each character can own, catalogue-search, and equip personal items | C1-C2 + A5-A7 | `character-inventory.spec.ts` |
| M3 Party Workspace | Users can create, list, open, edit, and join parties | A8-A12 | `party-workspace.spec.ts` |
| M4 Shared Party Inventory | Party members can manage a shared item pool | A13 | `party-items.spec.ts` |
| M5 Party Treasury and Activity | Party members can manage shared money and view activity | A14 | `party-treasury.spec.ts` |
| M6 Character Party Context | A linked character shows personal and party resources separately | A15 | `character-party-link.spec.ts` |
| M7 Legacy Data Cutover | Operators can safely import and reconcile legacy party data | A16 | Fixture import and idempotency tests |
| M8 Merge Complete | The combined workflow passes in release-like conditions | A17 | `character-party-inventory.spec.ts` |

## M1. Personal Treasury

Ship when every accessible character displays an independent treasury and the player can add and
spend currency with previews and automatic making-change.

Manual acceptance:

1. Start the stack, sign in, and open an existing character.
2. Confirm a character with no treasury row displays zero PP, GP, SP, and CP without an error.
3. Add mixed denominations and verify each balance and total GP value.
4. Spend an amount that requires making change and inspect the live preview before submitting.
5. Attempt to overspend and confirm balances do not change.
6. Refresh the browser and confirm balances persist.
7. Open a second character and confirm its treasury remains independent.

Automated gate: add `tests/e2e/character-treasury.spec.ts`, then run `pnpm lint`,
`pnpm test:unit`, `pnpm test:integration`, `pnpm api:check`, `pnpm test:e2e`, and `pnpm build`.

## M2. Personal Inventory

Ship when a player can manage personal items on a character without creating or joining a party.
The UI includes the legacy manager's icons, rarity treatment, search, filters, SRD auto-fill, and
detail behavior.

Manual acceptance:

1. Confirm catalogue status reports items as unseeded, then run the catalogue seed.
2. Confirm status reports the pinned source revision and accepted counts for weapons, armor,
   adventuring gear, consumables, potions, scrolls, and magic items.
3. Open a character and confirm the personal inventory empty state offers an add action.
4. Search the local SRD catalogue by partial name and confirm both mundane equipment and magic-item
   results are available through the same search experience.
5. Choose a result, confirm the item form is auto-filled with normalized catalogue data and source
   version, then add the item.
6. Add a custom item with a different type, rarity, and quantity.
7. Verify icons, rarity colors, quantity badges, search, type filters, and counts.
8. Open an item, edit it, equip it, and refresh; confirm both data and equipment state persist.
9. Confirm the saved item still renders while external D&D APIs are unavailable.
10. Unequip and delete the item through the confirmation flow.
11. Open another character and confirm it cannot see the first character's items.
12. Confirm duplicate upstream records are shown once using the documented source precedence and
    that 2014 and 2024 variants are never silently merged.

Automated gate: add `tests/e2e/character-inventory.spec.ts`, then run `pnpm lint`,
`pnpm test:unit`, `pnpm test:integration`, `pnpm api:check`, `pnpm test:e2e`, and `pnpm build`.

## Future Party Roadmap

The following milestones are retained for the later party merge and are outside the M1/M2 baseline.

## M3. Party Workspace

Ship when a signed-in user can create, list, reopen, and edit a party, and another user can join
through the supported membership flow. Party pages may show empty shared inventory and treasury
sections; their management actions arrive in M4 and M5.

Manual acceptance:

1. Open the party workspace and confirm its empty state offers a create action.
2. Submit invalid values and confirm field-level validation appears.
3. Create a party with a name, description, and optional passphrase.
4. Return to the list, reopen the party, edit it, and refresh.
5. Confirm the creator is shown as owner.
6. Sign in as another user, join with the valid passphrase, and reopen the party.
7. Confirm an invalid passphrase and a non-member direct URL do not grant access.

Automated gate: add `tests/e2e/party-workspace.spec.ts`, then run `pnpm lint`,
`pnpm test:unit`, `pnpm test:integration`, `pnpm api:check`, `pnpm test:e2e`, and `pnpm build`.

## M4. Shared Party Inventory

Ship when a party member can manage the shared item pool using the item behavior already proven for
personal inventory. Shared items remain independent from all character inventories.

Manual acceptance:

1. Open a party with no shared items and confirm the party-specific empty state.
2. Add one SRD item and one custom item with different types and rarities.
3. Verify icons, rarity colors, quantity, search, filters, and item counts.
4. Confirm party items do not show equip controls.
5. Open, edit, and refresh an item; confirm the update persists for another party member.
6. Delete an item through confirmation.
7. Confirm no linked or unlinked character receives a copy of the shared item.

Automated gate: add `tests/e2e/party-items.spec.ts`, then run `pnpm lint`, `pnpm test:unit`,
`pnpm test:integration`, `pnpm test:e2e`, and `pnpm build`.

## M5. Party Treasury and Activity

Ship when a party member can manage a treasury that is separate from every personal treasury and can
inspect activity for shared item and currency changes.

Manual acceptance:

1. Add mixed denominations to the party treasury and verify total GP value.
2. Spend an amount requiring change and verify the preview and final balances.
3. Confirm overspending is rejected without changing balances.
4. Refresh and verify the party balances persist without altering any character treasury.
5. Inspect recent activity for the M4 item changes and current currency changes.
6. Verify readable descriptions, timestamps, newest-first ordering, and pagination.

Automated gate: add `tests/e2e/party-treasury.spec.ts`, then run `pnpm lint`, `pnpm test:unit`,
`pnpm test:integration`, `pnpm test:e2e`, and `pnpm build`.

## M6. Character Party Context

Ship when a player can link one character to an accessible party and understand the boundary between
personal and shared ownership from the character detail page.

Manual acceptance:

1. Prepare a character with personal money and an equipped personal item.
2. Prepare a party with different money and one shared item.
3. Link the character to the party.
4. Confirm personal treasury and inventory appear first and remain editable.
5. Confirm party treasury and items appear in a clearly separate shared section.
6. Change party data from the party page and confirm the character view reflects it after refresh.
7. Unlink the character and confirm personal data remains while the shared section disappears.
8. Confirm the character cannot link to an inaccessible party.

Automated gate: add `tests/e2e/character-party-link.spec.ts`, then run `pnpm lint`,
`pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, and `pnpm build`.

## M7. Legacy Data Cutover

Ship when an operator can import a production SQLite copy into Postgres without creating personal
character resources or duplicating party data on repeated runs.

Manual acceptance:

1. Copy the source SQLite database to a non-production path.
2. Run the importer in dry-run mode with an explicit target owner user ID.
3. Review source counts, target deltas, currency totals, mappings, and rejected rows.
4. Import into an empty staging database.
5. Open imported parties and spot-check shared items, icons, rarity, treasury, and history.
6. Run the same import again and confirm counts and totals do not increase.
7. Confirm existing personal character treasuries and items are unchanged.
8. Save the reconciliation report and rollback procedure as cutover evidence.

Automated gate: run `pnpm lint`, `pnpm test:unit`, the fixture import integration test, the
idempotency test, and a staging dry run against a production-data copy.

## M8. Merge Complete

Ship when one cross-feature journey proves the completed system in release-like conditions.

Manual acceptance:

1. Run the M1 through M7 checklists against the release candidate and record pass/fail results.
2. Manage personal money and an equipped personal item on a character.
3. Create a party and manage a different shared item and treasury balance.
4. Link the character and verify both scopes, then unlink without data loss.
5. Run `pnpm preview` and repeat the core journey on desktop and mobile widths.
6. Confirm the migration runbook, reconciliation artifact, and rollback procedure are current.

Automated gate: add `tests/e2e/character-party-inventory.spec.ts`, then run `pnpm lint`,
`pnpm test`, `pnpm build:image`, and `pnpm check:docs`.

## Milestone Evidence

Each milestone PR or release record must include:

- The commit or preview environment used for manual testing.
- The completed manual checklist with tester and date.
- The focused automated spec added by the milestone and the full validation result.
- Screenshots for visual acceptance such as icons, rarity styles, scope labels, and responsive layout.
- Any deferred defect, its owner, and why it does not block the user outcome.

## Rollout Order

M1 and M2 are mandatory character releases before party work begins. M3 through M6 add party
functionality cumulatively. M7 implementation may begin once the party schema is stable, but
production cutover waits until M6 is deployed and verified. M8 is the final release gate.
