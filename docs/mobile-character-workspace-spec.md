# Mobile Character Workspace Specification

Status: Implemented and independently reviewed in the main-based review stack; final stack CI pending.
Not merged or deployed. See the [acceptance record](./mobile-workspace-acceptance.md) for evidence
and physical-device follow-up.
Last verified: 2026-09-07

## Purpose And Authority

Make the character workspace a phone-first reference tool used during a D&D session. Players must
see identity, level, XP progress, and HP at a glance; change sections without returning to the top;
and reach useful section content and save actions with little scrolling.

The implementation base is **origin/main `faf519271e2b06a825025ba433c38005340b116e`**.
The [execution plan](./mobile-character-workspace-plan.md) defines dispatch, evidence, and gates;
[UI design guidance](./ui-design.md) records the durable design contract. Status is target behavior,
not proof of implementation. PR #96 is not an implementation dependency.

## Scope And Verified Main Baseline

Main provides character name/class/level, name/level/XP editing, calculated experience, health/history,
spell slots/use/restore/configuration, saved spells/cantrips/features, treasury, inventory CRUD,
catalogue/equipment/filters, and activity history. Two local Mantine tabs default to
Spells & Abilities and unmount inactive content. Only `/characters/:id` exists and route navigation
uses full-page location assignment. Section URLs and retained view state are NEW refactor behavior.

Included: compact shell/XP/health; two-section navigation; inventory content priority; compact spell
presentation; reachable actions for existing character, spell configuration/search/removal, item and
treasury workflows; health sheets; About/Privacy; touch targets; visual evidence and agent guidance.
Excluded: unmerged Attributes & Rolls (#96), attribute schemas/editors/reference calculations,
automatic leveling, party/campaign features, new API/database models, offline data, new fonts/themes,
and changed mutation semantics. Do not import unmerged features to satisfy this specification.
PR #96 measurements are historical motivation only: capture current main independently.

## Future Rolls Integration

Use a small section-definition list and section-scoped view state. A separately specified future
feature can add Rolls without replacing shell, XP, health, or overlay layering. Ship exactly
Spells and Inventory now: no placeholder, disabled tab, Rolls route, fake data, or speculative query.
A future change must explicitly update destination order/default, routing tests, fixtures, and
visual baselines; no third destination is part of this acceptance gate.

## Shared Visual Contract (V)

- **V1:** Use the existing Mantine theme. Use Mantine default dark-scale page/surface/text roles (main has no custom dark palette), selected navigation text `bloodstone.3` and rule `bloodstone.5`, XP `candle.4` (#ffca28).
  These selected-navigation tones were explicitly accepted in independent mobile/desktop review
  for readable text and a distinct non-color selection rule within the existing palette. These are roles, not permission to recolor all components.
  Keep existing semantic health/error colors and verify contrast against their actual backgrounds.
- **V2:** Preserve current Inter family and small radii. Identity 18-20 px semibold/bold; body and
  editable inputs 16 px; utility labels 12-14 px; navigation labels at least 12 px. Use tabular
  numerals for XP, HP, modifiers, and currency. Do not shrink text to satisfy a height budget.
- **V3:** Use 12-16 px mobile content gutters, 8-12 px related-control gaps, and 16-24 px section
  spacing. No outer Paper padding layered inside another mobile page gutter. Keep borders/dividers
  purposeful; do not turn each statistic into a separate card.
- **V4:** Mobile mode is below Mantine `sm` (currently 48em). At/above `sm`, use top section
  navigation, no bottom bar. Retain a compact wrapped header at tablet widths and readable section layouts. Test both sides of each breakpoint.
- **V5:** Mobile identity/XP region target: 72-88 px; health row: 44-48 px; entire persistent top
  region at most 144 px, including padding/dividers but excluding top safe area. Bottom bar target:
  56-64 px excluding bottom safe area. Content gets bottom clearance for bar plus 12-16 px.
  At 200% text enlargement or constrained landscape height, readability outranks these budgets:
  allow wrapping and put the top region in document flow when viewport height is below 500 px.
- **V6:** Use `env(safe-area-inset-*)` exactly once per relevant edge and dynamic viewport sizing
  where appropriate. Top region is sticky; bottom navigation is fixed. Modal/sheet overlays sit
  above both. No z-index escalation by individual section agents.
- **V7:** No decorative animation or animated count-up. Respect reduced motion. Selected navigation
  combines text/icon treatment and a visible shape/rule, not color alone.

### Mobile Reference Composition

```text
+--------------------------------------+
| <  Mira Thorn v              Account |
|    Wizard - Level 3                  |
|    [==========----] 72% to Lv 4       |
+--------------------------------------+
| HP 18/27 +3 temp [History][Heal][Damage]|
+--------------------------------------+
| Spells & Abilities            [Edit] |
| Cantrips & features                  |
| Fire Bolt                    Details |
| Level 1      3/4     [Use][Restore]  |
| Magic Missile                Details |
| ...                                  |
+--------------------------------------+
|       Spells             Inventory   |
+--------------------------------------+
```

Wireframes define hierarchy, not literal typography or icon glyphs. HP/temp may use two lines
inside its target; control sizes must not be sacrificed to fit one line. The identity button may
visually occupy multiple lines. The full character name must remain available in character details.

## Shell, XP, And Health (H)

- **H1:** On character detail, replace the site title/tagline/sign-in block and standalone back link
  with one character header. Back is a real link to the roster. Identity opens character details.
  The person-icon account menu exposes only About, Privacy, and the appropriate Sign in or
  Account/Sign out actions; character actions must not be mixed into it. Anonymous users can reach sign-in without leaving the character.
  No character-dependent bottom navigation appears on roster, creation, privacy, or not-found pages.
- **H2:** Keep character name, class, level, XP progress, current/effective-max HP, Health history, Heal, and Damage
  visible in the persistent mobile top region. Show temporary HP when nonzero; omit "Temp HP 0".
  Health history opens the existing newest-first log directly in one tap and restores focus to its
  own trigger, with section/scroll unchanged on close. Its target is at least 44 x 44 px with the
  accessible name Health history; its visible label appears when space permits.
  Tapping the HP readout opens Edit health. Give the identity and HP readouts semantic button names;
  avoid nesting progress bars or buttons inside other interactive elements incorrectly.
- **H3:** Character details shows the full name, class, exact XP, current level, next threshold,
  remaining XP, and access to the existing name/level/XP editor. Preserve existing mutation/cache
  behavior and errors. Identity has a subtle chevron and hover/pressed/focus treatment. Editor
  Save/Cancel/Escape returns to details with Edit character focused; closing details restores
  identity focus. Never stack active details/editor dialogs. Full details need not be permanently expanded in the header.
- **H4:** Render authoritative `character.experience` response data; do not duplicate threshold
  tables or derive level from XP in the component. Label ordinary progress as `{percent}% to Lv N`.
  If `!isMaxLevel && experienceRemaining === 0`, label `Level N available`. At max level label
  `Max level` and omit a nonexistent next level. Include accessible text describing XP and state.
- **H5:** XP indicator is a thin 3-4 px bar plus readable label, adding approximately 16-20 px to
  identity. Progress is within the current level, clamped by the existing domain calculation.
  XP below the current level minimum shows 0%; XP above multiple thresholds offers the next level
  only. Reaching a threshold never changes level or proficiencies automatically.
- **H6:** Health mutations immediately reconcile shared character cache. Current HP and effective maximum already include temporary-HP semantics: render returned
  values (F1 is 18/27 with temp 3, base max 24), without adding temp a second time. Keep current health rules,
  caps, temporary HP semantics, and history intact. No new rules behavior is part of this design.
  Loading/error in a section does not remove the working header or navigation.
- **H7:** Character-level loading shows a compact skeleton/status with a roster escape. Not-found
  and session failures use existing recovery semantics; do not leave stale identity/XP from a
  previously selected character visible.
- **H8:** Remove the footer from character detail at all widths. About contains the existing
  unofficial-service attribution; Privacy remains a real `/privacy` link. Keep the existing footer
  on public/informational screens. Do not delete privacy content or change authentication semantics.

### XP Acceptance Examples

| Saved level | Saved XP | Header state |
| --- | --- | --- |
| 1 | 0 | 0% to Lv 2 |
| 3 | 2196 | 72% to Lv 4 (900 minimum; 2700 next threshold) |
| 3 | 2699 | 99% to Lv 4; not available yet |
| 3 | 2700 | Level 4 available |
| 3 | 6500 | Level 4 available; saved level remains 3 |
| 5 | 0 | 0% to Lv 6; no negative progress |
| 20 | 355000 | Max level; no next-level label |

## Navigation And View State (N)

- **N1:** Exactly two equal-width mobile destinations: Spells and Inventory, each with icon
  and visible label. Accessible names are Spells & Abilities and Inventory.
  No duplicated top tabs in mobile mode. All destinations fit at 320 px without horizontal scroll.
- **N2:** Add canonical `/characters/:id/spells` and `/characters/:id/inventory` URLs. Legacy
  `/characters/:id` remains a Spells alias. Preserve real anchor hrefs, modified-click behavior,
  reload, and browser Back/Forward. Do not introduce an Overview
  destination or unrelated actions in the bar. No badges requiring inactive-section requests.
- **N3:** Only the active section mounts its queries. Retain view state separately, keyed by
  character ID and section: inventory search/category, and scroll offset for both sections. Spell search and
  configuration drafts are transient editing state; no new main-screen spell search is required.
  Preserve that state on section switches and Back/Forward within the current workspace session.
  Different characters must not inherit it. Reload may reset view state while preserving URL/data.
- **N4:** On first visit to a section, position its heading below the persistent header. On return,
  restore its prior scroll offset after the content is available, clamping if the content shrank.
  Announce/focus the destination heading without overriding restored scroll. Resize must not reset
  filters or server data. No inactive section may remain keyboard-focusable.
- **N5:** Do not retain modal drafts as section view state. Modal focus trapping prevents background
  navigation. Browser navigation may dismiss a local editor without submitting; it never silently
  saves. Respect any existing discard protection. New discard-confirmation behavior is out of scope.
- **N6:** At normal text size, top and bottom chrome stay visible when scrolling long sections.
  With an on-screen keyboard, focused search, its results, and editor actions must remain reachable;
  the bar may be occluded by the keyboard and must not overlay the input or float across results.

## Spells And Inventory (S/I)

- **S1:** Keep cantrips/features and numbered slot groups with saved spells. Compact headings and
  administration so F1 shows the first saved entry and one usable numbered slot group at 390 x 844;
  the first saved entry is visible at 320 x 740. Spell history is hidden from players. Remove redundant
  framing and verbose tier metadata from the default content path; defaults remain in editing.
- **S2:** Preserve use/restore, all slot totals, defaults, catalogue search/save/remove, cantrips,
  features, saved details, backend slot-change records, and server reconciliation. Do not expose a
  spell-history toggle, log or empty-history message. Preserve independent slot/list query
  states and recoverable errors. Empty states explain how to add/configure content.
- **S3:** Use/Restore, Edit, add/remove/details targets meet E4. Pending prevents duplicate
  submissions. Configuration/search/detail/removal meet E1/E3 without preserving half-edited drafts
  by retaining background sections. No new spell search/filter product behavior is required.
- **I1:** Inventory order: title with History action; compact treasury with PP/GP/SP/CP and Add
  funds/Spend; item search/Add item; category filters; item results or actionable empty state.
  Treasury summary is at most 104 px at normal text size. Preserve denominations; no misleading
  combined gold balance. Do not display an empty recent-activity card before items.
- **I2:** History opens the existing activity workflow on demand, retaining filtering, pagination,
  retry, and reconciliation. Activity/treasury failures are local and cannot hide usable items.
- **I3:** Preserve item CRUD, catalogue search/autofill, equipment state, filter counts, detail,
  and treasury safety/reconciliation behavior. No requirement to redesign card internals.
  Search and the first item (at least name, quantity, and its detail target) fit at 390 x 844;
  search/Add item are visible at 320 x 740.
## Editors, Accessibility, And Recovery (E)

- **E1:** Below `sm`, long item forms and spell configuration use full width/available height,
  one scrolling body, and persistent Cancel/Save changes actions. Character editing and treasury
  forms have reachable actions; short forms may use compact sheets. Spell search/details/removal
  retain appropriately labeled reachable actions. Remove width insets in fullscreen mode. Desktop
  retains appropriate modal/inline workflows. Last fields/errors clear the action row.
- **E2:** Heal/Damage use a bottom sheet on mobile and modal on desktop. Include amount, resulting-HP
  preview using the existing rules, Cancel, and Apply healing/Apply damage. Nonzero temporary HP and
  health caps must not produce a preview that disagrees with the saved result. Invalid/empty amounts
  do not submit. Failures keep the amount and show an error inside the sheet. Pending prevents repeats.
- **E3:** Preserve existing validation, previews, no-op behavior, error reset and draft retention.
  Character name/level/XP currently save sequentially and can partially succeed: surface honest
  failure/server state, never promise atomic rollback. Cancel slot configuration does not submit. On invalid submit, bring the first invalid field into
  view and focus it. Keyboard-open save actions must remain accessible without dismissing the keyboard.
- **E4:** All header, bottom navigation, search-clear, filter, disclosure, health, and editor action
  targets touched here are at least 44 x 44 px. Enlarging hit areas must not create overlaps.
  Inputs use at least 16 px text. No page-level horizontal overflow at the specified widths.
- **E5:** Visible focus, meaningful names, semantic headings/navigation, active-page state, progress
  announcement, focus trap, and return focus are required. Modals make background chrome inert.
  Contrast meets WCAG AA: 4.5:1 normal text; 3:1 large text and essential control boundaries/indicators.
  Errors/XP availability must not depend on color. At 200% text enlargement all functionality remains
  available even when more scrolling is necessary.
- **E6:** Do not change existing transaction semantics to implement the layout. Optimistic previews
  are labeled as previews; successful server responses remain authoritative. No duplicate submission
  when requests are slow. Successful character edits update visible identity/XP without reloading.

## Implementation Boundaries

Use Mantine, generated API/TanStack Query helpers, existing route-link helpers, and current domain
types. Follow [React conventions](./react.md), [architecture](./architecture.md), and
[implementation procedure](./implementation.md). No `useEffect` in application source.

The app owns account/about/privacy and route-sensitive site chrome. The characters UI owns loaded
character context, navigation, and character-scoped ephemeral view state. Inventory UI owns its
treasury/history/item presentation and mutations, exported through its existing UI boundary.
Compose them in character detail; do not make inventory import character UI or expose providers to
domains directly. Section agents consume the orchestrator's agreed controlled view-state contracts.

Persistence, caches, and view state are distinct: retain view state without keeping every section
mounted or issuing speculative requests. The implementation owner must document how scroll/focus
restoration uses existing route events and explicit callback/event boundaries without lifecycle
effects. Prefer small adapters and existing helpers over a new global state library.

## Definition Of Done

All H/N/S/I/E criteria and V layout constraints pass the traceable gates in the companion plan.
Independent visual review accepts both mobile and desktop integrated output. Required tests run on
the exact candidate commit. Unavailable physical-device checks are separately tracked follow-up,
not an artificial blocker to source/CI acceptance; never claim emulation proves native behavior.
Missing evidence is not a pass. Implementers update quality/testing docs only for verified changes.
