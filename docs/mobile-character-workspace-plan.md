# Mobile Workspace Dispatch And Validation Plan

Status: Ready for orchestration; no implementation tasks completed.
Last verified: 2026-09-07

Product authority: [mobile workspace spec](./mobile-character-workspace-spec.md).
Read it in full before dispatch. Criteria IDs below refer to that document. This is a bounded UI
initiative, not permission to expand rules, backend scope, or the product theme.

## Orchestrator Responsibilities

1. Pin main `faf519271e2b06a825025ba433c38005340b116e`. PR #96 is excluded. Record base/candidate
   SHAs and branches; reconcile newer main deliberately without importing Attributes & Rolls.
2. Complete M0 before implementation. Give each agent the spec, its task card, frozen shared
   contracts, fixture manifest, base SHA, allowed files, test requirements, and reference artifacts.
3. Use isolated worktrees/branches. One owner per shared file. Section agents request composition
   changes through the integration owner instead of editing shared shell files concurrently.
4. Require evidence and review each task before integration; run the final gate on the combined tree.
   A task that works alone can still break sticky offsets, focus, loading, or another section.
5. Keep a criterion matrix with owner, test/evidence path, candidate SHA, and PASS/FAIL/BLOCKED.
   Do not infer acceptance from an agent's completion message.

## Dispatch Graph And Shared Ownership

```text
M0 contracts + fixture/reference preparation
  -> M1 app shell/navigation/state foundation
      -> M2 identity/XP/health
      -> M3 Spells layout
      -> M4 Inventory layout
      -> M5 editor/sheet behavior
  -> M6 verification harness (after M0; integrate alongside M1-M5)
M1 + M2 + M3 + M4 + M5 + M6 -> M7 integration and independent acceptance
```

M2-M5 can proceed in parallel after the foundation lands and contracts are frozen. M2 owns health
panel composition; M5 owns health dialog implementation. Agree their props in M0 so neither edits
the other's file. M1/integration owner exclusively edits `src/app/app.tsx`, `src/app/theme.css`,
`character-detail.tsx`, `character-workspace.tsx`, route files, and shared navigation. M4 alone edits
the inventory UI barrel. M6 owns shared browser helpers/configuration. Task authors own tests for
their components; M6 owns new cross-cutting browser specs. Coordinate docs edits through M7.

Paths abbreviated to filenames in task cards resolve under `src/domains/characters/ui/` unless an
app, inventory, or tests prefix is given. Confirm names on the pinned base; do not invent missing APIs.

### M0 - Freeze Contracts And Visual References

Owner: orchestrator/design integration owner. Depends on: none.

Deliverables:

- Locate existing shell, routing, XP, health, spells, inventory, and history entry points.
  Define exact props/types for header slots, controlled per-section view state, history trigger,
  health preview/error props, and responsive editor chrome. Record them in a small implementation
  note under `docs/`; types remain in the appropriate UI boundary, not domain data schemas.
- Document who owns route scroll capture/restoration, focus announcements, safe-area offsets,
  dialog stacking, and account access. Resolve this before multiple agents begin implementation.
- Capture baseline screens from the pinned base using the fixtures below. Produce a small static
  target reference/mockup for mobile Spells, Inventory, and item editing, plus desktop shell.
  A local HTML/CSS reference is sufficient; label sample content and nonfunctional controls.
- Compare the target against spec criteria and geometry budgets. The orchestrator accepts the target
  with a recorded rationale before dispatch; user approval is needed only for changes to agreed
  product scope. This spec's wireframes and criteria remain authoritative over mockup accidents.

Acceptance: every task has an unambiguous boundary; target references include XP and usable touch
areas; reference content matches fixture values; no independent agent is asked to invent the shell.
Validation: inspect the reference at 320/390/1280 widths and verify V1-V7 feasibility. If it cannot
fit, adjust composition within the spec before implementation, not by shrinking controls.

### M1 - Responsive Shell, Navigation, And View State

Owns: app shell/footer/About access, character detail/workspace/route/navigation, shell CSS, initial
controlled state contracts. Coordinates account UI through app-owned callbacks/composition.
Depends on M0. Criteria: V3-V7, H1/H7/H8, N1-N6.

Deliverables: route-sensitive compact shell, bottom bar below `sm`, desktop tabs, safe content
offsets, accessible About/Privacy/account entry points, ephemeral per-character/section state,
scroll and focus restoration. Initial section adapters can land before their redesigned content.

Acceptance: both destinations visible at 320 px; no duplicate navigation; direct URLs and
Back/Forward work; switching character clears the visible prior context; section failure retains
navigation; inactive sections issue no requests solely to preserve state. Roster/privacy/create
remain navigable and do not acquire character navigation. Menu opens above chrome.

Validation: route parsing/link unit tests; focused browser traversal including modified links,
scroll-return, direct reload, resize, section error, and sign-in entry. Capture top/scrolled states
at mobile and desktop sizes. No change to authentication or authorization contracts.

### M2 - Compact Identity, XP, And Health

Owns: new `character-ribbon.tsx`, `character-experience-panel.tsx`, `health-panel.tsx`, character details
presentation and its connection to the existing editor. Does not edit health dialog internals.
Depends on M1; consumes M0 header/dialog contracts. Criteria: H2-H6, V1/V2/V5, E4/E6.

Deliverables: compact identity/XP, exact-details access, HP readout/Edit trigger, Heal/Damage,
health-history menu integration. Menu wiring in shared files is applied by M1/integration owner.

Acceptance: every XP example in the spec matches the existing server-derived state; level is never
automatically changed; details shows full long names; current/effective max and nonzero temporary
HP are readable. Header stays within budget for the standard fixture. Successful edits update
header and existing section data without a full reload; failures retain existing recovery behavior.

Validation: parameterized presentation tests for XP boundary/max/below-minimum cases; browser edit
XP then level, health update, and cross-section cache checks. Screenshot ordinary/available/max XP,
long name, zero HP, and nonzero temporary HP. Use controlled slow/failing requests for pending/error.

### M3 - Existing Spells Presentation

Owns: `spell-slot-panel.tsx`, `spell-slot-list.tsx`, `non-slot-spell-list.tsx`, related focused
styles/tests. Shared shell remains M1-owned. Depends on M1. Criteria: S1-S3, E4/E5.

Deliverables: compact heading/admin actions, useful cantrip/feature/slot groups in first viewport,
44 px targets, preserved use/restore/defaults/catalogue/details/history and independent query states.
Coordinate configuration editor changes with M5; one file owner applies the combined patch.

Acceptance: F1 first saved entry and numbered slot with usable Use/Restore fit at 390 x 844;
first saved entry at 320 x 740. Every existing spell workflow remains reachable. No new Rolls code.
Validation: existing spell journeys, slow/failing mutation, empty/populated states, browser switching
sections and scrolling back, screenshots top/scrolled at mobile/desktop. Confirm saved state after reload.

### M4 - Inventory Content Priority

Owns: inventory UI treasury/character-inventory/character-activity presentation and UI exports;
focused section styling and tests. Composition in `character-detail.tsx` stays with integration owner.
Depends on M1. Criteria: I1-I3, N3 adapter, E4/E5.

Deliverables: compact four-denomination treasury; action-based History entry; item-first content
order; controlled inventory search/category view state. Reuse the existing history drawer.

Acceptance: first-viewport item/search criteria pass with populated fixtures; no empty history
card before items; treasury stays within 104 px at normal text size. Add/Spend and item workflows
remain reachable. Treasury/history failures do not remove item access; history filters/pagination
and mutation reconciliation still work. No denomination or ledger semantics change.

Validation: existing treasury safety/reconciliation, inventory, and activity journeys; focused
state-return test; screenshots populated/empty/error inventory, long item names, history drawer,
and treasury actions. Verify old selectors are intentionally migrated, not deleted to hide failures.

### M5 - Existing Editors And Health Sheets

Owns: `character-editor.tsx`, `health-dialogs.tsx`, spell editor actions/search/removal, inventory
item/treasury form overlays, focused editor styles/tests. M3/M4 apply patches in their owned files.
Depends on M1; consumes agreed health/dialog contracts. Criteria: E1-E6.

Deliverables: responsive editor chrome with one scrolling body and reachable persistent actions;
mobile Heal/Damage sheets with authoritative-rules previews; field focus, local errors, retained
drafts, pending guards, focus return. Short forms may use sheets; long forms use full mobile height.

Acceptance: Save/Cancel reachable at top/middle/bottom; last input/error unobscured. Cancel never
submits. Failed writes retain useful draft/error state. Character sequential saves report partial
success honestly; no new transaction semantics. Health preview equals saved result with temp/caps.
Background navigation cannot activate through overlays. Desktop workflows remain usable.
Validation: existing character/spell/item/treasury browser journeys plus invalid submit, slow/failed
save, focus trap/return, health cap/temp cases. Capture long form top/middle/bottom, field/server
error and preview. Native keyboard checks are separate device follow-up if unavailable.

### M6 - Reproducible Visual And Interaction Harness

Owns: new `tests/e2e/mobile-workspace*.spec.ts`, fixture helpers, evidence writer, agreed shared test
helpers/config updates. Depends on M0; can run alongside implementation. Criteria: full matrix.

Deliverables: deterministic fixture setup using existing owned-stack/API helpers; viewport/state
matrix; geometry/visibility/hit-area assertions; targeted Playwright screenshots; evidence manifest
with SHA, fixture, route, dimensions, state, and criteria. Add screenshot regression support if needed;
current Playwright config does not itself define a visual acceptance suite.

Acceptance: rerunning the same candidate yields stable captures; script verifies UI readiness rather
than sleeping arbitrarily; no production database or external catalogue dependency; geometry detects
overlap/hidden last rows even when screenshots look plausible. Request failures are isolated to the
scenario and restored afterward. Frozen baselines are not generated from unreviewed agent output.

Validation: run harness on baseline and candidate; prove a known baseline geometry violation is
reported. Deliberately perturb test-only layout to prove a screenshot/geometry assertion fails,
then remove the perturbation. Do not commit application fault-injection code.

### M7 - Integration And Independent Acceptance

Owner: orchestrator plus visual reviewer who did not implement the reviewed task.
Depends on all packages. Owns integration fixes, shared composition, criterion matrix, release report.

Acceptance: all spec criteria mapped to passing evidence on the integrated SHA; no unexplained
regressions in existing flows; automated and independent visual gates complete; physical-device availability/status recorded. Resolve collisions before
testing. A fix affecting layout requires refreshed affected captures, not a stale task screenshot.

Validation: execute the protocol below. Update [quality tracking](./quality.md) and
[testing procedure](./testing.md) to reflect actual added coverage and durable limitations.

## Fixtures And Required States

Use deterministic API/owned-database setup, scoped per test. Never read or mutate real user data.
Reuse existing catalogue loopback fixtures; no live network catalogue is required for visual tests.

| Fixture | Required data and purpose |
| --- | --- |
| F1 standard | Mira Thorn, Wizard level 3, XP 2196, returned HP 18/effective max 27, base max 24, temp 3; configured numbered slots plus saved cantrip and level-1 spell from deterministic catalogue |
| F2 populated | F1 plus at least 12 items across categories with quantities/equipped states, long item name, all four currency denominations, at least 12 activity entries for paging; configured spell slots and saved spell/cantrip/feature via existing fixture capabilities |
| F3 boundaries | XP table from spec; level 20; zero HP; long 120-character name; HP 9999/9999; temp 9999; large supported currency values |
| F4 empty | New anonymous character, empty items/history/spells;  no artificial empty-history card |
| F5 failures | Character not found/session error; independent spells/items/treasury/history failure; failed character/item/health save; slow pending mutation |

Record exact payloads/fixture version. Fix locale to en-US and timezone to UTC for screenshots;
freeze time for relative activity labels using test facilities. Dynamic IDs need not be fixed if
they are not visible. Reset fixture between mutation scenarios so earlier screenshots do not alter
later expected values. Read back all setup responses: adding temp HP changes current HP under existing rules; do not
assume the first submitted base/current/temp combination produces the desired displayed fixture.

## Viewport And Device Matrix

| Surface | Required coverage |
| --- | --- |
| 320 x 740 | All sections, long names, editor/health sheet, first saved spell entry, search/Add item visible |
| 390 x 844 | All sections, top/scrolled/bottom states, first saved spell and numbered slot controls, first item visible |
| 430 x 932 | All sections and header boundary states; verify no unnecessary extra whitespace |
| 767 x 900 and 768 x 900 | Exactly one navigation presentation across default sm boundary |
| 1280 x 900 | Desktop all sections, modal, footer/menu access; no bottom bar |
| 844 x 390 | Landscape: usable content, relaxed top stickiness, no unreachable actions |
| 390 x 844 with 200% text | Reflow/readability and all actions; normal density budgets waived |
| Physical iOS Safari + Android Chrome | Browser and installed standalone where installable; notch/home indicator, keyboard, rotation, Back, editor actions |

Use effective theme breakpoints if customized; update matrix explicitly rather than silently
moving assertions. Viewport emulation cannot prove native keyboard, safe-area, or installed-PWA
behavior. Reduced viewport height alone is not a keyboard test. If physical devices are unavailable,
record those rows NOT RUN (device follow-up), identify the human/device owner and steps, and do
not claim native-device acceptance. This does not block source/CI and emulated visual acceptance. Existing PWA/offline scope is unchanged.

## Visual Acceptance Protocol

### 1. Freeze The Reference

M0 produces `work/design-review/mobile-workspace/reference/` artifacts and a reference manifest.
Commit compact reference artifacts or store immutable CI artifacts with recorded hashes. Include
baseline screenshots and the target mockup; they serve different purposes. Baseline images show
what must improve; target images express the agreed hierarchy. Neither can overrule functional
criteria. Version any changed design decision before regenerating expectations.

### 2. Capture Actual Candidate Output

Capture the running integrated app, not recreated HTML or a mock standing in for it. Record SHA,
dirty status, browser/version, OS, viewport, device scale, text scale, fixture, route, scroll position,
open overlay, and command. Prefer a clean candidate; any dirty run must include its patch hash.
Wait for fonts and expected data/control state; disable animation through test facilities. Capture
both viewport and full-page images for each section at 320/390/1280, plus the focused states above.
Full-page images alone cannot demonstrate fixed/sticky behavior; capture scrolled viewport frames.

Use names such as `M3-F1-spells-populated-390x844-scrolled.png`. Store output under
`work/design-review/mobile-workspace/<candidate-sha>/` or a CI artifact with the same structure.
Include `manifest.json`, geometry results, test logs, and an acceptance report. Do not commit bulky
traces/videos unless repository policy calls for it; retain them as linked CI artifacts.

### 3. Assert Geometry And Behavior

- Measure actual bounding rectangles: header <=144 px and bar 56-64 px excluding safe areas,
  frequent targets >=44 x 44 px, treasury <=104 px, prescribed first-viewport content counts.
- Verify no document horizontal overflow (allow <=1 px rounding tolerance); controls are fully
  inside the visible content region and not underneath chrome. Use hit-testing at control centers
  as well as rectangles so an overlay cannot falsely pass geometry.
- Scroll to the last item/spell and last editor field. Verify they clear bottom navigation/actions.
  Repeat with dropdowns, validation errors, and large text. At landscape/large-text exceptions test
  reachability instead of applying ordinary header budgets.
- Verify only one active navigation landmark/presentation, full accessible destination names,
  keyboard traversal, restored state/scroll, local errors, and query isolation. Run an accessibility
  scan for automatable contrast/name/role problems; independently inspect focus and reading order.

### 4. Review Images Independently

The orchestrator or independent reviewer opens actual screenshots and exercises the running build.
Compare target, baseline, and candidate side by side using identical fixtures/viewports. Inspect
each required state; sampling only the attractive desktop screenshot is insufficient.

| Review axis | Pass question |
| --- | --- |
| Hierarchy | Are identity, XP, HP, and useful active-section content visible in the intended order? |
| Density | Is space recovered without small text, tiny targets, or crowded labels? |
| Navigation | Is the selected destination unmistakable and reachable while scrolled? |
| State clarity | Are leveling, empty, error, pending, and health preview states understandable? |
| Consistency | Do all agents' surfaces share gutters, type roles, colors, actions, and overlay behavior? |
| Accessibility | Are labels, focus, contrast, enlarged text, keyboard, and safe areas usable? |
| Desktop | Does the wider layout retain useful columns and avoid a stretched phone design? |

For each axis record PASS/FAIL/BLOCKED and criterion IDs; do not average away a failure with an
overall aesthetic score. Record concrete defects with screenshot coordinates/selector, viewport,
expected behavior, actual behavior, owner, and reproduction steps. Reject clipped XP, missing
destinations, obscured Save, tiny controls, unreadable contrast, and absent required content even if
tests pass. Within-contract minor spacing differences can pass with an explicit reviewer note.

### 5. Establish Regression Baselines Only After Acceptance

Mockup-to-app pixel equality is not a gate: Mantine rendering and real content can differ from the
reference while honoring the contract. Use geometry plus independent review for the first version.
Only accepted real-app captures become Playwright screenshot baselines. Pin browser/OS/fonts/DPR
and use Playwright's default pixel comparison initially; document any narrow tolerance needed for
proven rendering noise. Never increase tolerances or mask XP, text, navigation, controls, or layout
to make a failure disappear. Mask only irrelevant nondeterminism that fixtures cannot stabilize.
Baseline updates require independent review of before/after images and a linked reason.

## Test Commands And Completion Gate

Follow [testing procedure](./testing.md): stack ports come from metadata/environment, never a fixed
port. `pnpm test` owns the catalogue fixture and starts the stack. A manually running worktree stack
must be stopped before browser orchestration; do not stop another task's stack. Do not assume extra
test filename arguments are forwarded by `scripts/test.ts`; M6 documents any focused runner added.

For implementation acceptance run `pnpm lint`, `pnpm api:check`, `pnpm test`, `pnpm build`,
`pnpm check:docs`, and `git diff --check` on the candidate. Component owners can use focused unit
tests during iteration; final UI validation still requires the full repository gate. No new database
tests are needed merely for CSS; retain existing integration coverage. Test important state/search
logic at unit level and real navigation/persistence/overlay behavior in browser tests.

Any failing required CI/full-suite check blocks automated acceptance. Record logs and compare with
pinned main before calling a failure pre-existing; do not waive failures merely because a prior PR
reported similar symptoms. Physical devices are separate follow-up when unavailable. Final reporting
must distinguish automated tests, inspected real-app visuals, native-device checks, and deployment.
For the requested native GitHub stack, every layer must have passing applicable CI on its current
head, and the top integrated tree must satisfy the complete gate. Do not deploy/merge to manufacture
CD evidence; report preview/build checks or deployment checks actually run under repository policy.

### Agent Handoff Template

```text
Task / base SHA / candidate SHA:
Owned files and shared-file patches requested:
Criteria satisfied (IDs):
Behavior and contracts changed:
Tests: exact commands, pass/fail counts, log paths:
Visual evidence: fixture, viewport/state, image and geometry paths:
Known failures or unavailable checks:
Integration dependencies / risks:
```

### Orchestrator Acceptance Record

```text
Candidate SHA and clean/dirty evidence:
Reference version and fixture version:
Criterion ID | task | test/evidence path | reviewer | PASS/FAIL/BLOCKED
Automated gate:
Visual review axes:
iOS/Android keyboard, safe-area, standalone checks:
Defects and disposition:
Accepted regression baselines and rationale:
Remaining blockers / next owner:
```

The orchestrator closes source/CI/visual acceptance only when those required gates pass, recording
unavailable device checks as explicit follow-up. Source compilation and an
agent's screenshot collection alone are insufficient evidence of a finished mobile redesign.
