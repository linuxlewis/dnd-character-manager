# Mobile Workspace Acceptance Record

Status: Implementation and independent source/browser acceptance complete in the review stack; final-stack
CI acceptance pending. Not merged or deployed. Last reviewed: 2026-09-07.

## Candidate And Evidence Authority

The implementation preserves main `faf519271e2b06a825025ba433c38005340b116e` functionality.
PR #96 Attributes & Rolls is excluded; only Spells and Inventory ship. The source candidate is
`333f843`, tested through clean QA commit `b6d09ac6ef5099da5c6c02e0c28e3fdb0e3e07ad`.
Later documentation commits do not change that tested source. A subsequent source correction
requires its own recorded validation and must not be represented as this candidate's capture.

The immutable [candidate evidence index](../work/design-review/mobile-workspace/accepted-b6d09ac/README.md)
contains 62 viewport captures, their full-page counterparts and JSON metadata, six contact sheets,
file hashes, and command summaries. The design reference is guidance; these images render the real
application with its real owned-stack APIs and deterministic local catalogue fixture F2-main-v1.
The [specification](./mobile-character-workspace-spec.md), [dispatch protocol](./mobile-character-workspace-plan.md),
and [durable UI contract](./ui-design.md) remain product authority.

Root independently inspected all six final contact sheets, full-size 200% item-editor and 320 px
configuration error images, and live shell/navigation/focus behavior. The visual-harness agent
also inspected all six. Both accepted hierarchy, density, XP states, responsive navigation,
complete final-card clearance, full error copy, and enlarged-text actions at this candidate.
Manual accessibility follow-up identified and verified the filter-count contrast correction below.

## Executed Gates

| Gate | Result at the tested candidate |
| --- | --- |
| `pnpm test` | PASS: 599 unit, 68 integration, 40 browser tests |
| `pnpm lint` | PASS: formatting and architecture checks |
| `pnpm api:check` | PASS: generated contracts current |
| `pnpm build` | PASS: production client/server and PWA output; existing chunk-size advisory |
| `git diff --check`, `pnpm check:docs` | PASS; repeated after final documentation edits |
| Real browser visual review | PASS on the viewport/state matrix; E5 manually verified |
| Built preview smoke | NOT ESTABLISHED: built successfully, but fixture setup timed out waiting for the roster; live review used the owned development stack |
| Physical-device/installed-mode testing | NOT RUN; explicit follow-up below |

The nine crosscutting tests in `tests/e2e/mobile-workspace.spec.ts` and navigation journey supplement
existing character, health, spell, treasury, inventory and activity tests; they do not replace those
mutation/reconciliation checks. A test-only occluding element deliberately fails geometry before
removal, proving the gate checks occlusion rather than accepting every plausible rectangle.

## Criterion Traceability

Results below describe source/browser acceptance, with the explicit physical-device and screen-reader follow-up limits.
Every criterion is listed so future changes can target the owning behavior and evidence.

| ID | Result and verification |
| --- | --- |
| V1 | PASS: Existing palette retained; bloodstone.3 selected text/bloodstone.5 rule explicitly accepted; candle.4 XP. Final contrast correction verified under E5. |
| V2 | PASS: Typography/numeric hierarchy reviewed in all sheets; enlarged text and long-name cases pass. |
| V3 | PASS: Mobile gutters, grouped controls and section spacing reviewed in top/bottom captures. |
| V4 | PASS: Geometry covers 767/768 and 991/992 boundaries, plus 320/390/430/1280 widths. |
| V5 | PASS: Automated header/nav budgets and first-content reachability pass at normal text; 844 x 390 landscape and 200% text remain usable. |
| V6 | PASS emulated; device NOT RUN: Last-card corner hit tests pass after bottom-padding correction; overlays cover chrome. Real safe areas remain device follow-up. |
| V7 | PASS: Stable selected rule/icon/text and reduced-motion browser context reviewed. |
| H1 | PASS: Navigation journey exercises roster escape, details/menu and app links; auth/session journeys remain green. |
| H2 | PASS: Header/health target bounds and accessible labels pass, including zero/max/temp numeric fixtures. |
| H3 | PASS: Character details/editor exercised in navigation and character journeys; full name available in details. |
| H4 | PASS: XP 0/900/2196/2699/2700/6500/355000 fixtures exercise 0%, 72%, 99%, available, max labels. |
| H5 | PASS: Saved levels 1/3/5/20 retained; below-minimum and above-next-level XP remain correctly clamped. |
| H6 | PASS: Health-flow and mobile-health tests preserve previews, saved server values, cache updates and history; F2 asserts 18/27 with temp 3. |
| H7 | PASS: Crosscutting not-found/local-failure tests retain escape and working chrome; existing session recovery passes. |
| H8 | PASS: Character footer removal reviewed; About attribution and Privacy navigation exercised in navigation test. |
| N1 | PASS: Exactly two real destinations, 44 px targets and no mobile top duplicates in geometry matrix. |
| N2 | PASS: Canonical/legacy paths, real links, reload and browser navigation in navigation journey. |
| N3 | PASS: Search/Potion/scroll survive section switch and Back; inactive query interception proves isolation. |
| N4 | PASS: First-heading placement and restored offset checked after content settles; root independently observed restored scroll 291. |
| N5 | PASS: Failed item draft/focus test proves trapping and background shielding; cancellation and menu return-focus verified. |
| N6 | PASS emulated; keyboard NOT RUN: Persistent chrome at top/bottom and constrained height pass; actual software keyboard remains NOT RUN. |
| S1 | PASS: First saved entry and usable numbered group visible in 390/320 captures. |
| S2 | PASS: Existing spell/health flow plus mobile-spells journey pass use/restore/configuration/catalogue/details/removal and error recovery. |
| S3 | PASS: Complete action-label ranges and targets checked; configuration last field/error clear persistent footer. |
| I1 | PASS: Treasury/search/filters/items ordering reviewed across all widths; compact treasury geometry passes. |
| I2 | PASS: Activity/history journeys preserve filters/pagination/reconciliation; local treasury failure does not hide items. |
| I3 | PASS: Inventory CRUD/catalogue/equipment/filter journeys pass; search/first-item geometry passes. |
| E1 | PASS: Fullscreen long editors have one scroll body and reachable persistent actions; top/bottom/error/200% captures reviewed. |
| E2 | PASS: 320/390 health journeys verify sheets, invalid input, failure retention, previews, pending and server reconciliation; desktop modal preserved. |
| E3 | PASS emulated; keyboard NOT RUN: Failed item/config drafts retained, last fields/errors reachable; existing character sequential-save semantics preserved. Native keyboard check outstanding. |
| E4 | PASS: Changed controls checked for 44 x 44 bounds, overlap and full action labels; no page overflow in matrix. |
| E5 | PASS: Focus trap/return, visible focus, names and enlarged text pass. Inactive count contrast now 10.12:1 and active 12.88:1; do not infer universal accessibility conformance from axe 0 violations. |
| E6 | PASS: Existing mutation/safety/reconciliation suite passes; slow/failed editor behavior verified without changing transactions. |

## Accessibility Review And Corrections

Settled axe 4.12.1 scans using WCAG 2A/AA report zero violations on fourteen reviewed surfaces:
Spells, Inventory, item editor, treasury Add/Spend, Damage, health history, inventory history,
About, character editor, spell configuration/search/details/removal. Thirteen were captured on the
preceding source revision; inventory history was rechecked on `f675112` after its scoped contrast fix.
Post-fix badge colors were captured from source `20b2d0e` after HMR settled, before full-suite validation.
These reports are diagnostic evidence, not a claim that every accessibility requirement is proven.

Manual review of `incomplete` results found inactive inventory category counts using white text on
`rgb(173,181,189)`, approximately 2.1:1. Axe excludes these short numeric labels from automatic
contrast conclusions. Source `20b2d0e` corrects inactive counts to black. Post-fix computed colors give 10.12:1 inactive and 12.88:1 active, closing this finding.
The extra About paragraphs, spell description and remove explanation flagged for uncertain
backgrounds were inspected in the live DOM: text rgb(201,201,201) against dialog rgb(36,36,36) exceeds 9:1.
All remaining short-text contrast incompletes refer to the corrected inactive counts.
History also retains existing `aria-label` on narrative paragraphs/time elements, reported as
incomplete support: visible text and native time content remain available, but expanded spoken
wording requires a screen-reader follow-up. Do not count incomplete findings as passed checks.

Fixed during this review: menu and item-editor focus return; low-contrast metadata/history/editor
labels; essential input boundaries; destructive spell-confirmation label; unnamed/small About and
Sign-in close actions; partial last-card occlusion; configuration fields/error body shrinking
beneath persistent actions; and item-error Alert backgrounds shrinking beneath their title/body.
The stronger corner-hit test first reproduced last-card and configuration-error occlusion,
then passed after their source corrections. The final item-error screenshot exposed an additional
Alert flex-shrink defect. Source `333f843` prevents direct editor-body children from shrinking;
the shared text-range assertion now requires every title/body fragment inside its Alert for both
item and spell errors. The item case also asserts the real generated-client HTTP 503 error message.
A separate pre-fix live reproduction attempt timed out at its Name locator and is not counted
as successful automated reproduction; the reviewed screenshot and source diagnosis established it.
Neutral field borders now use actual rgb(133,133,133) against rgb(46,46,46) backgrounds;
focus/error styling remains distinct.

## Remaining Validation And Future-Agent Rules

Physical iOS Safari, Android Chrome, notch/home-indicator safe areas, actual software keyboards,
rotation and installed standalone mode are NOT RUN. Owner: product/device reviewer designated by
the orchestrator. Follow the [device checklist](./mobile-workspace-validation.md#device-follow-up),
recording device/OS/browser/build SHA and results. Emulated height/text is not native-device proof.

Locale en-US, timezone UTC and reduced motion are fixed in Playwright; server clocks and history
timestamps are not frozen. No regression pixel goldens are approved. Before adding screenshot
expectations, freeze timestamps, independently review the real-app candidate and pin its hashes.
Never regenerate expected images merely to silence a failing gate.

Final QA-stack CI must be verified on the submitted head. Later documentation/evidence commits may
reuse this source test run only if application and test source are unchanged. Any new source fix
requires appropriate tests and new evidence scoped to what changed. Do not describe this review
as a production deployment or include unmerged Attributes & Rolls to make a screenshot look complete.

## Character Action Follow-up

The subsequent character-action adjustment supersedes the original mixed-menu behavior for H1,
H2, H3, N5 and E5. Earlier screenshots and acceptance results remain historical evidence at their
recorded source SHA, not proof of the updated controls. The current contract separates account
actions, provides one-tap Health history beside Heal/Damage, and returns character editing to
details. Follow-up validation must record exact focus, unchanged section/scroll, 320/390/desktop
geometry, 200% text, and updated screenshots before independent acceptance. Physical-device
checks remain NOT RUN.

Follow-up source/browser acceptance: PASS at clean `0fad2dcc4f306834381cd9ec25645a057b286acb`
(application source `51ec86e`). The full suite passed 599 unit, 68 integration and 40 browser
tests; lint, API freshness, typecheck/build, documentation links and whitespace checks passed.
The [focused evidence manifest](../work/design-review/mobile-workspace/character-actions-0fad2dc/manifest.json)
records 22 real-app screenshots and their formatted metadata/checksums. Root and the independent
visual reviewer accepted mobile/desktop controls, details/editor/history, maximum HP, 200% text
and the related Use/Restore wrapping correction. Browser tests cover exact focus after successful,
partial and cancelled edits, history scroll retention, and complete target/text containment.
Root also verified history focus return, details-to-editor-to-details cancellation, identity focus
return, and the signed-in account-only menu on the running Tailscale development instance without
changing its seeded character data. Current PR-head CI is the final external gate; these results
do not claim native-device, screen-reader or production deployment acceptance.

CI follow-up at clean `e30f6a88f2bd472af764067df58835234c2cb5c1` corrects the enlarged-text
test's automatic scroll alignment without changing application source. The first PR run placed
Add item beneath the enlarged sticky header. The test now scrolls into the measured space between
header and navigation, checks the entire target, text and corner hit-testing, then clicks normally
at both 320 and 390 px. The CI-mode full local suite passes 599 unit, 68 integration and 40 browser
tests. Root and the independent reviewer accepted the four [additional captures](../work/design-review/mobile-workspace/character-actions-e30f6a8/manifest.json).
Local Chrome keyboard checks also confirm Tab reaches Add item, Enter opens the editor and Escape
returns focus at both widths with 200% text and the 120-character name. These local checks do not
replace the outstanding physical-device and screen-reader validation.

Final source/browser acceptance: PASS at clean `a6234a258f1a9c840e8fd8ee720a44f73ce5151f`.
CI exposed a further 19 px overflow in the Consumable filter with wider fallback fonts at 320 px
and 200% text. Filter buttons now shrink to available width and wrap their labels/counts while
retaining minimum touch targets. The regression explicitly exercises DejaVu Sans, full target/text
containment, corner hit-testing and normal filter/editor clicks. Drawer-width checks allow only
subpixel rounding (two decimal places), after CI reported 600.000009 px for a 600 px viewport.
The CI-mode full local suite passes 599 unit, 68 integration and 40 browser tests; build, lint,
documentation links and whitespace checks pass. Root and the independent reviewer accepted the
[final inventory evidence](../work/design-review/mobile-workspace/character-actions-a6234a2/manifest.json).
Earlier manifests retain their original source provenance; this final source adds only the scoped
inventory-filter wrapping change and test corrections to the previously reviewed character actions.

## Hidden Spell History

The product decision to hide spell history supersedes the original S1/S2 on-demand spell-log
requirement. At clean `aed3e793dd66421650fc0ee2beb52e61150d7ed6`, the toggle, expandable log and
unused presentation code are removed. Edit spells, configuration, Use/Restore and backend records
remain available. Health history and inventory activity are unchanged. No deferred abilities or
Attributes & Rolls functionality is introduced.

The CI-mode full local suite passes 597 unit, 68 integration and 41 browser tests. Lint,
build/API freshness, documentation links and whitespace checks pass. Root and an independent
reviewer accepted the [four focused captures](../work/design-review/mobile-workspace/spell-history-hidden-aed3e79/manifest.json)
at 320, 390 and 1280 px, including the state after slot use. Browser coverage verifies no spell
history control or log, retained health-history touch targets, correct Use/Restore counts and
preserved API usage records. Earlier screenshots remain historical; physical-device and
screen-reader follow-ups remain outstanding.
