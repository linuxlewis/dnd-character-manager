# Mobile Workspace Acceptance Record

Status: Implementation complete in the review stack; final accessibility correction and final-stack
CI acceptance pending. Not merged or deployed. Last reviewed: 2026-09-07.

## Candidate And Evidence Authority

The implementation preserves main `faf519271e2b06a825025ba433c38005340b116e` functionality.
PR #96 Attributes & Rolls is excluded; only Spells and Inventory ship. The source candidate is
`f675112`, tested through clean QA commit `64efd03fbfb0c8fafd4f68d8b44b8741e6603966`.
Later documentation commits do not change that tested source. A subsequent source correction
requires its own recorded validation and must not be represented as this candidate's capture.

The immutable [candidate evidence index](../work/design-review/mobile-workspace/accepted-64efd03/README.md)
contains 62 viewport captures, their full-page counterparts and JSON metadata, six contact sheets,
file hashes, and command summaries. The design reference is guidance; these images render the real
application with its real owned-stack APIs and deterministic local catalogue fixture F2-main-v1.
The [specification](./mobile-character-workspace-spec.md), [dispatch protocol](./mobile-character-workspace-plan.md),
and [durable UI contract](./ui-design.md) remain product authority.

Root independently inspected all six final contact sheets, full-size 200% item-editor and 320 px
configuration error images, and live shell/navigation/focus behavior. The visual-harness agent
also inspected all six. Both accepted hierarchy, density, XP states, responsive navigation,
complete final-card clearance, full error copy, and enlarged-text actions at this candidate.
Manual accessibility follow-up identified the remaining filter-count contrast issue below.

## Executed Gates

| Gate | Result at the tested candidate |
| --- | --- |
| `pnpm test` | PASS: 599 unit, 68 integration, 40 browser tests |
| `pnpm lint` | PASS: formatting and architecture checks |
| `pnpm api:check` | PASS: generated contracts current |
| `pnpm build` | PASS: production client/server and PWA output; existing chunk-size advisory |
| `git diff --check`, `pnpm check:docs` | PASS; repeated after final documentation edits |
| Real browser visual review | PASS on the viewport/state matrix; E5 correction pending |
| Built preview smoke | NOT ESTABLISHED: built successfully, but fixture setup timed out waiting for the roster; live review used the owned development stack |
| Physical-device/installed-mode testing | NOT RUN; explicit follow-up below |

The nine crosscutting tests in `tests/e2e/mobile-workspace.spec.ts` and navigation journey supplement
existing character, health, spell, treasury, inventory and activity tests; they do not replace those
mutation/reconciliation checks. A test-only occluding element deliberately fails geometry before
removal, proving the gate checks occlusion rather than accepting every plausible rectangle.

## Criterion Traceability

Results below describe source/browser acceptance, with the explicit E5 and physical-device limits.
Every criterion is listed so future changes can target the owning behavior and evidence.

| ID | Result and verification |
| --- | --- |
| V1 | Existing palette retained; bloodstone.3 selected text/bloodstone.5 rule explicitly accepted; candle.4 XP. Final contrast correction tracked under E5. |
| V2 | Typography/numeric hierarchy reviewed in all sheets; enlarged text and long-name cases pass. |
| V3 | Mobile gutters, grouped controls and section spacing reviewed in top/bottom captures. |
| V4 | Geometry covers 767/768 and 991/992 boundaries, plus 320/390/430/1280 widths. |
| V5 | Automated header/nav budgets and first-content reachability pass at normal text; 844x390 landscape and 200% text remain usable. |
| V6 | Last-card corner hit tests pass after bottom-padding correction; overlays cover chrome. Real safe areas remain device follow-up. |
| V7 | Stable selected rule/icon/text and reduced-motion browser context reviewed. |
| H1 | Navigation journey exercises roster escape, details/menu and app links; auth/session journeys remain green. |
| H2 | Header/health target bounds and accessible labels pass, including zero/max/temp numeric fixtures. |
| H3 | Character details/editor exercised in navigation and character journeys; full name available in details. |
| H4 | XP0/900/2196/2699/2700/6500/355000 fixtures exercise 0%,72%,99%,available,max labels. |
| H5 | Saved levels1/3/5/20 retained; below-minimum and above-next-level XP remain correctly clamped. |
| H6 | Health-flow and mobile-health tests preserve previews, saved server values, cache updates and history; F2 asserts18/27 with temp3. |
| H7 | Crosscutting not-found/local-failure tests retain escape and working chrome; existing session recovery passes. |
| H8 | Character footer removal reviewed; About attribution and Privacy navigation exercised in navigation test. |
| N1 | Exactly two real destinations,44px targets and no mobile top duplicates in geometry matrix. |
| N2 | Canonical/legacy paths, real links, reload and browser navigation in navigation journey. |
| N3 | Search/Potion/scroll survive section switch and Back; inactive query interception proves isolation. |
| N4 | First-heading placement and restored offset checked after content settles; root independently observed restored scroll291. |
| N5 | Failed item draft/focus test proves trapping and background shielding; cancellation and menu return-focus verified. |
| N6 | Persistent chrome at top/bottom and constrained height pass; actual software keyboard remains NOT RUN. |
| S1 | First saved entry and usable numbered group visible in390/320 captures. |
| S2 | Existing spell/health flow plus mobile-spells journey pass use/restore/configuration/catalogue/details/removal and error recovery. |
| S3 | Complete action-label ranges and targets checked; configuration last field/error clear persistent footer. |
| I1 | Treasury/search/filters/items ordering reviewed across all widths; compact treasury geometry passes. |
| I2 | Activity/history journeys preserve filters/pagination/reconciliation; local treasury failure does not hide items. |
| I3 | Inventory CRUD/catalogue/equipment/filter journeys pass; search/first-item geometry passes. |
| E1 | Fullscreen long editors have one scroll body and reachable persistent actions; top/bottom/error/200% captures reviewed. |
| E2 |320/390 health journeys verify sheets, invalid input, failure retention, previews, pending and server reconciliation; desktop modal preserved. |
| E3 | Failed item/config drafts retained, last fields/errors reachable; existing character sequential-save semantics preserved. Native keyboard check outstanding. |
| E4 | Changed controls checked for44x44 bounds, overlap and full action labels; no page overflow in matrix. |
| E5 | Focus trap/return, visible focus, names and enlarged text pass. Inactive filter-count contrast correction remains pending; do not infer accessibility conformance from axe0violations. |
| E6 | Existing mutation/safety/reconciliation suite passes; slow/failed editor behavior verified without changing transactions. |

## Accessibility Review And Corrections

Settled axe4.12.1 scans using WCAG2A/AA report zero violations on fourteen reviewed surfaces:
Spells, Inventory, item editor, treasury Add/Spend, Damage, health history, inventory history,
About, character editor, spell configuration/search/details/removal. Thirteen were captured on the
preceding source revision; final source rechecked inventory history after its scoped contrast fix.
These reports are diagnostic evidence, not a claim that every accessibility requirement is proven.

Manual review of `incomplete` results found inactive inventory category counts using white text on
`rgb(173,181,189)`, approximately2.1:1. Axe excludes these short numeric labels from automatic
contrast conclusions. This requires a source correction and follow-up evidence before E5 acceptance.
History also retains existing `aria-label` on narrative paragraphs/time elements, reported as
incomplete support: visible text and native time content remain available, but expanded spoken
wording requires a screen-reader follow-up. Do not count incomplete findings as passed checks.

Fixed during this review: menu and item-editor focus return; low-contrast metadata/history/editor
labels; essential input boundaries; destructive spell-confirmation label; unnamed/small About and
Sign-in close actions; partial last-card occlusion; and configuration fields/error body shrinking
beneath persistent actions. The stronger corner-hit test first reproduced the final two issues,
then passed after their source corrections. Neutral field borders now use actual rgb133 against
rgb46 backgrounds; focus/error styling remains distinct.

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
