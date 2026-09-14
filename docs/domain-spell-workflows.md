# Spell Workflow Ownership And Recovery (R9)

Base: accepted R8 `624c89b38369cc1fa26ab4092537bf2917dea713`,
[PR #117](https://github.com/linuxlewis/dnd-character-manager/pull/117), successful
CI run `34176310606`. R7 [PR #116](https://github.com/linuxlewis/dnd-character-manager/pull/116)
also passed CI run `34175991433` at `0198553fe11ca4a00aaa4816eaba6c6a931b4f0f`.
R9 accepted at `cc6387549d8bd82295761f7eeb3f6050ddc8ae5a`,
[PR #118](https://github.com/linuxlewis/dnd-character-manager/pull/118), CI `34177152588` passed.

## Responsibilities And Deleted Indirection

The existing search modal now owns input, 300ms debounce, generated POST search,
save mutation, local error/retry, and saved-list cache updates. Details owns its
real selected-ID query, loading/error/refetch, and presentation. Remove owns its
selected spell, mutation, local error, pending-close guard and list update. These
are the existing components, not a new container/content layer.

The parent retains the cohesive slot query/configure/use/restore/default/history
workflow and saved-list query shared by numbered and non-slot lists. Its four
slot mutations still update counts/history together, reset drafts and exit editing
only on success. Errors survive toggling edit mode or opening another modal.

| Parent responsibility | Before | After |
| --- | --- | --- |
| Queries | Slots, saved list, search, details | Slots and saved list |
| Mutations | Four slot operations, save, remove | Four slot operations |
| Presentation state | Three independent nullable modal selectors | One character-bound dialog discriminator |
| Modal props, including portal test options | 20 | 12 |
| Modal workflow context/close props, excluding portal options | 17 | 9 |

Deleted forwarding-only edit-actions and alerts modules and their forwarding tests.
Their buttons/alerts remain at their actual state owners. Removed parent search,
save/remove and details plumbing, the closed-dialog zero-UUID sentinel, nullable
query contexts, the one-line search-result formatter wrapper, and the redundant
numbered-spell filter. Slot draft conversion, history formatting, zero-slot saved
spell visibility, layout and backend rules remain intact.

## Asynchronous Rules

Search keys retain character, bucket and current debounced text. Until current
input matches the debounced value, previous results are hidden. Search/details
failures are visible inside their own modal and retry only when explicitly requested.
Save failure keeps input/selection context, has an explicit retry button, and never
fabricates a saved row. Closing and reopening resets that workflow's attempt state.

Saving/removing cannot be dismissed through escape, overlay, or the close controls
while pending. Their successful responses update the saved-list key derived from
mutation variables. Parent dialogs have character/selection keys; close callbacks
clear selection only if its object still matches the original dialog. A late
response cannot close a newer dialog or write another character's cache. Slot
successes likewise use originating variables and reset local drafts only for the
current character. No health/detail/list/inventory invalidation or new recovery
protocol is added. Existing API payloads and transport remain unchanged.

## Mounted Evidence

The production-page browser scenarios verify:

- Search fails once, explicit retry succeeds, save fails with input retained and
  no saved row, then explicit save retry succeeds exactly once. Pending close is
  disabled and escape cannot dismiss. Reopening has clean query/error state.
- Details failure appears locally and refetch succeeds. Remove cancel sends no
  DELETE; failure keeps confirmation/row; retry blocks dismissal until success,
  removes only the selected row, and leaves no global modal error behind.
- A held old search response arrives after a newer query and another slot bucket
  open. Only the current bucket results remain visible. Barriers release in finally.
- Failed slot use leaves counts unchanged; editing/canceling drafts and opening a
  modal preserve its error. Explicit use retry updates counts/history once and
  clears that operation's error. Save/remove/slot journeys observe no unrelated
  character/detail/health/inventory GETs caused by invalidation.

A narrow test-only Vite fixture mounts the actual public spell panel with real
React and QueryClient. While save for A is held, it changes character props to B
and opens B's dialog. Releasing A updates only A's cache and leaves B's empty list
and newer dialog intact. It uses existing dependencies and no production test hook.
Remove uses the same variables/cache/guarded-close pattern and additionally has
its own production-page pending/cancellation checks. SSR tests cover rendering
only; the browser scenarios establish request and mutation behavior.

## Validation And Accounting

Lint, build/typecheck/API freshness pass and report-only boundaries remain at zero.
Full Gate B passes: 201 unit files / 672 tests, 30 integration files / 98 tests,
and all 31 Chromium journeys in 54.8 seconds. The real-panel late-save proof passes
in 2.8 seconds. The runner exits 0 and removes its owned stack; documentation and
whitespace checks pass. Logs:
`/tmp/domain-r9-{lint,build,test,boundaries,quality,docs,diff}.log`. Heavy validation
uses `VITEST_MAX_WORKERS=4` and `/tmp/domain-r2a-compose-network.yml` for the owned
Compose stack, with cleanup and no unrelated network pruning.

Handwritten production adds 226 and removes 263 lines (net -37). Parent shrinks
295 to 250 lines. Search grows 85 to 127, details 82 to 89, remove 40 to 67 as each
owns its actual asynchronous work. The two deleted wrappers account for 68 old
file lines, but retained button/alert markup moves into owners; those 68 lines are
not claimed as pure elimination. Tests add 467 and remove 167 (net +300), replacing
forwarded-state tests with actual failure/pending/cache-origin coverage. No generated
artifacts, migrations or API contracts change. Documentation is counted separately.

Ripwire exits 2 with six observations, three gating. Search function verbosity
75 to 120 reflects deliberate ownership of query/save/retry; splitting it into
another forwarding component would undo this refactor. Details grows six function
lines. A small promise barrier matches existing test helpers; an unchanged inventory
helper group also appears as a normalized clone. The dialog callback and browser
fixture Window type have live uses despite dead-code reports. No suppression or
quality acknowledgement is added.

The first full run passed unit/integration and 30 of 31 browser journeys. The late
save fixture returned `/spells/light`, which correctly failed the production URL
schema requiring `/api/2014/spells/light`; its result button never appeared. The
fixture now supplies a valid URL and asserts visibility before clicking; closed-page
cleanup no longer obscures a primary failure. No production code, timeout or retry
policy changed for this correction. Original log/trace/video/snapshot are preserved
at `/tmp/domain-r9-first-failure/`.

Rollback is a code revert or predecessor deployment; no data migration is needed.
R10 owns final enforcement/bridge removal and R11 owns integrated stack acceptance.
