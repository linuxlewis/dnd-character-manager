# Attributes Adaptation After Domain Extraction

This handoff compares baseline `faf519271e2b06a825025ba433c38005340b116e`,
historical attributes stack `e104044c39982ea3167afa9ffa10f13f393fab4c`
(PRs #94/#82/#83/#89/#93/#96), and final refactor implementation
`2824232f0b9acd844868025bd747607175042dfd`. Source review was repeated at the final
refactor SHA. These findings concern the historical stack, not an adapted branch;
no attributes implementation or merge-readiness claim is included here.

## Behavioral Decisions Before Adaptation

| Historical issue and trigger | Baseline and final refactor classification | Required future regression |
| --- | --- | --- |
| Delta health retry: commit 5 damage at 20 HP, lose the response, then retry the still-open draft; the historical API applies another -5 to persisted 15 HP | Introduced by the attributes stack. Baseline and final health UI send absolute HP (15 again in this exact scenario); final health PUT normalizes under the identity lock. This is not general idempotency or stale-write protection | Commit the actual request then drop its response; assert one intended delta/history event and no blind replay. Failed reconciliation must retain the draft and uncertainty, block another mutation, and permit read retry. Define recovery/deduplication before adding delta input |
| Slot recovery clear: lose a committed use response and fail reconciliation GET; Edit/Done calls the historical recovery hook's clear(), removes uncertainty, and unblocks another action on stale data | The recovery mechanism and its clearing bypass are stack additions. Neither baseline nor final refactor has that hook. Final toggle only changes drafts/editing and preserves mutation errors; it does not supply the missing lost-response protocol | Use real browser requests; after failed reconciliation attempt Edit/Done, defaults/configuration, and recovery retry. Require one mutation, persistent uncertainty/action block, and committed state displayed after successful reconciliation |
| Ability score clamping: enter 31 or 0 then blur/click Save; Mantine NumberInput min=1/max=30 defaults to blur clamping, so validation sees 30 or 1 | Attributes UI is absent from baseline and final refactor. This is a new-widget validation problem, not acceptance of an invalid server value | Mount the actual NumberInput; type 0 and 31, blur, submit, retain invalid input with adjacent error and zero mutation requests. Correcting to 1/30 permits explicit save. Configure clamping to preserve validation intent |

Historical source anchors at the attributes SHA:

- `src/domains/characters/ui/health-panel.tsx:68` sends `currentHpDelta`;
  `service/character-health-service.ts:23` applies it to current persisted HP.
  The repository lock serializes requests but cannot deduplicate sequential replay.
- `src/domains/characters/ui/spell-slot-panel.tsx:174` calls recovery clear;
  `ui/use-spell-slot-action-recovery.ts:29` unblocks actions. The existing browser
  test at `tests/e2e/character-spell-slot-recovery.spec.ts:79` retries the read
  immediately and misses Edit/Done between failure and retry.
- `src/domains/characters/ui/character-attributes-editor.tsx:164` supplies min/max
  without overriding blur clamping; `character-attributes-ui.ts:38` validates only
  after the widget has changed the input. The existing empty-value browser case
  does not test numeric blur behavior. The pinned Mantine version is 9.2.2.

Final source anchors are [absolute health submission](../src/domains/health/ui/health-panel.tsx),
[locked health normalization](../src/domains/health/repo/character-health-repository.ts),
[slot editing and mutation owners](../src/domains/spellcasting/ui/spell-slot-panel.tsx),
and [real workflow failure tests](../tests/e2e/spell-workflow-recovery.spec.ts).
Health event `currentHpDelta` remains an output/history calculation, not an
additive request field. Do not confuse the shared name with the historical API.

## Adaptation Work Units

Use the [module map](./domain-refactor-module-map.md) to replace historical paths.
Each unit needs its own reviewed SHA and relevant gate; the refactor's passing
suite is not evidence for the later feature's changed behavior.

1. **Attributes ownership and persistence:** create dedicated schema/types/config/
   repo/service/runtime/UI ownership; publish narrow layer indexes, declare FK
   dependencies, register tables once and put inverse character relations in database
   assembly. Resolve `0014_character_attributes.sql` against the existing
   `0014_inventory_history_actor.sql`; do not recreate extracted physical tables.
2. **Creation and composed reads:** use the application's creation transaction and
   public initializer contracts. Extend application detail projection/schema and
   generated contracts. Do not restore the deleted legacy character-repo creation
   factory or put aggregate schemas back in the identity domain. Test initializer
   rollback, required-related-row absence, ownership and bounded related reads.
3. **Domain behavior and recovery:** adapt health and slot changes to their current
   owners, retaining identity-first locks, current-state calculations, atomic history,
   and remote work outside locks. Resolve and test the three decisions above before
   porting the historical delta/recovery/input code.
4. **UI and cache composition:** mount the public attributes UI from application
   detail. Explicitly coordinate attributes/level changes with detail, health, and
   spell caches using originating-character IDs. Preserve late-response isolation
   and newer-dialog retention. Feature UI must not import aggregate application types.
5. **Generated integration and final validation:** regenerate contracts/clients from
   final ownership, reconcile migration numbering, and run the appropriate full gate
   at the adaptation SHA. Confirm existing URLs, operation IDs and response envelopes
   intentionally remain compatible or document deliberate feature contract changes.

These are subsequent feature tasks. R11 does not modify attributes branches,
introduce a retry protocol, merge, or deploy.
