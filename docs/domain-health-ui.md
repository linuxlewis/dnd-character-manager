# Health UI Ownership And Cache Coordination (R6)

Base: accepted R5 `4d735cc8d7c792e239e931d2c9c359a7b9d624d9`,
[PR #114](https://github.com/linuxlewis/dnd-character-manager/pull/114), successful
CI run `34158469787`. R6 accepted at `2d6eb6eb831ef4852e2ae7794f71beb8d5d57c95`,
[PR #115](https://github.com/linuxlewis/dnd-character-manager/pull/115), CI `34158961988` passed.

## Ownership

Health owns its panel, amount/edit dialogs, display helpers, and co-located tests.
The panel's public entrypoint exposes only `CharacterHealthPanel`. Its required
`onHealthUpdated(response, characterId)` callback carries the authoritative public
health response and the originating ID from mutation variables. A late completion
cannot redirect cache writes to a newly rendered character ID. The panel retains
its generated mutation, local drafts/pending/error state, heal/damage clamping,
collapsed history, and existing absolute PUT/retry behavior.

Application UI owns workspace navigation, detail-page assembly, and the creation
form because creation combines identity and health. Identity list/editor/experience
and the current spell panel remain in character UI, consumed through its deliberate
public entrypoint. Route/navigation types remain character-owned. Name/class/level
validation moves into a local character UI module, keeping the editor independent
of the application creation form. Spell `NumberDraft` belongs to the existing
spell list module; no private health UI import or shared abstraction is introduced.

Page order, links, window-location navigation/SSR fallback, default spells tab and
lazy inventory mounting remain unchanged. Health-only updates do not change
identity creation/edit list invalidation behavior. Spell extraction was assigned to R7/R8 and is complete in the
[final module map](./domain-refactor-module-map.md).

## Cache Contract And Evidence

`application/character-detail/cache/health.ts` updates only an existing generated
`getCharacter({ characterId })` key. It replaces health/history from the response
and preserves the outer envelope, identity and XP. An absent entry remains absent.
There is no independent health GET, fabricated summary, optimistic history, broad
invalidation, automatic replay, or generic coordination framework.

Real QueryClient tests preserve the complete state objects of another character,
list, slots, saved spells, treasury, items and activity queries; only the originating
detail changes. They also verify extra envelope fields survive and a late response
after cache removal creates no partial detail entry.

The browser failure/retry journey intercepts a real health PUT with 503, verifies
unchanged HP/history and the existing failure notice, then observes beyond the
first usual retry delay with exactly one PUT. A user retry submits the same
absolute values and updates displayed HP/history without navigation. The journey
records zero extra character API GETs after settled initial loading, proving no
list, spell or inventory refresh; inventory remains unmounted. Existing browser
journeys retain heal, edit/temp HP, damage, history persistence and navigation
coverage. SSR checks describe rendering only, not mutation execution.

## Validation

Logs are `/tmp/domain-r6-{install,lint,build,test,boundaries,quality,docs,diff}.log`.
Lint, build/typecheck/API freshness pass. The report-only boundary scan now reports
zero findings: the final F6 character-to-inventory UI composition edge is removed
without exemptions. Full Gate B passes: 196 unit files / 669 tests, 27 integration
files / 86 tests, and all 26 Chromium journeys in 42.2 seconds. The new failure/retry
journey passes in 7.9 seconds. The runner exits 0 and cleans up the owned stack.
Documentation links and whitespace checks pass.
The full runner uses `VITEST_MAX_WORKERS=4` and the coordinator-reserved Compose
network override `/tmp/domain-r2a-compose-network.yml`; it owns its stack cleanup.

## Accounting And Quality

Twelve existing UI/test files relocate: six production files and six test files,
containing 912 baseline lines. Git recognizes those renames; their movement is not
code elimination. Rename-aware handwritten production changes add 115 and remove
63 lines (net +52), chiefly explicit public exports, cache coordination, and
validation relocation. Tests add 160 and remove 18 (net +142), including cache and
browser failure coverage. Documentation is separate. No generated artifact,
migration, SQL metadata or API contract changes occur.

Ripwire reports 22 observations, six gating, and exits 2. Moved JSX components,
callbacks and types have visible callers despite dead-code classifications.
Moved component verbosity reflects their previous bodies. The six gating token
clone observations involve the existing `toSlotTotal` body, which is unchanged;
only its local NumberDraft import ownership changes. The coordinator reviewed
these observations and requested no generic helper or suppression. No waiver or
quality acknowledgement is added.

Rollback is a code revert on a new branch or redeployment of the predecessor;
there is no data migration to reverse. R7/R8 can consume the public character UI
entrypoint while moving spells and then replace the application spell-panel import.
