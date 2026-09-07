# UI Design And Interaction Contract

Last verified: 2026-09-07
Status: Target contract for the mobile refactor; implementation acceptance is tracked in the
[dispatch plan](./mobile-character-workspace-plan.md). Do not infer that this document proves
current code implements every behavior. The spec baseline is main `faf5192`.

## Product Character

This is a working D&D character sheet for players using a phone during play. Identity, XP and HP
orient the player; usable spells and inventory are the page's job. Prefer readable numbers and
clear actions over branding, nested cards, decorative dividers, and explanatory paragraphs.
Retain the existing dark Mantine palette, bloodstone selection/action accent, candle XP accent,
Inter type and small radii. Main uses Mantine's default dark scale; do not import a custom scale
from an unmerged branch. Numerical HP/XP/currency use tabular figures. No decorative count-ups.

## Stable Interaction Rules

- Character detail has compact identity/XP/health and mobile bottom navigation below `sm`.
  Spells and Inventory are the only shipping destinations; default is Spells. Desktop uses top
  navigation. No duplicate top/bottom tabs on a phone. The roster and privacy page retain site chrome.
- Identity opens exact character details; HP opens health editing. App-owned account/sign-in,
  About/attribution and Privacy remain reachable without restoring the large marketing header.
- Bottom navigation changes sections, never performs mutations. Real URLs support reload and
  browser navigation. Preserve per-character section scroll and inventory search/category.
  Editor drafts are local; opening a different character never reuses prior identity or view state.
- Health renders authoritative current/effective-max values and temporary HP. Level remains the
  saved level: XP availability suggests the next level, never changes it automatically.
- Useful content precedes history/administration. Inventory shows compact four-denomination
  treasury then search/items; activity is on demand. Spell controls operate slot groups; a saved
  spell's details must not imply automatic casting or slot expenditure.
- Use at least 44 x 44 px effective targets and 16 px editable text. Visible focus, accessible
  labels, error text, non-color selection and keyboard support are required, not optional polish.
- Long mobile editors use one scrolling body and persistent Save/Cancel. Short edits may use
  sheets. Overlays trap focus above chrome and restore focus on close. Pending prevents repeats;
  failed writes preserve useful drafts and honestly reflect any already-saved partial updates.
- Use one safe-area inset per edge; content clears fixed navigation/actions. At large text or
  short landscape heights allow more flow/scroll rather than shrinking text or hiding actions.

Exact geometry, XP examples and acceptance IDs live in the
[mobile workspace specification](./mobile-character-workspace-spec.md). Use Mantine primitives,
existing generated queries and domain APIs; follow [React conventions](./react.md). No lifecycle
effects, duplicated threshold tables, invented transaction semantics or new state libraries merely
for this layout.

## Guidance For Future Agents

Before changing layout, identify the target workflow and read the specification's scope. Review
accepted real-app screenshots and their fixture/viewport/SHA manifest, then test your output at
320, 390 and desktop widths. A green build alone does not establish visual acceptance. Follow the
[visual protocol](./mobile-character-workspace-plan.md#visual-acceptance-protocol); never replace
image baselines simply to silence a failing check.

A later Attributes & Rolls feature is explicitly deferred. It may add a third section through the
section-definition boundary; it must bring its own types, behavior, tests, route and updated design
acceptance. Do not display its tab, fetch its data or change the initial section before that feature
is approved and implemented. Review three-way mobile fit while retaining visible labels/targets.

When behavior ships, update this status and the spec/plan acceptance record with actual commit and
evidence. Update testing/quality docs only for verified coverage; keep unavailable physical-device
keyboard, safe-area and standalone checks visible as follow-up rather than claiming emulator proof.

## Filled Actions And Text Scaling

Use `workspace-primary-action` on filled primary actions in character workspaces and their portal
editors. Normal fill is bloodstone 5 (`#f43f5e`) with black text (5.72:1); hover and active fill is
bloodstone 4 (`#fb7185`) with black text (7.80:1). Do not rely on `autoContrast` alone: its default
threshold does not guarantee WCAG AA for this palette. Disabled controls retain Mantine styling.
Semantic green healing/red damage actions retain their separately verified colors. Check normal,
hover, focus, pending, and disabled states when extending this treatment.

Use rem-based text sizes in custom CSS so browser text enlargement affects HP, temporary HP, names,
and navigation labels as well as Mantine components. At 200% text size, permit wrapping and growth;
normal-size chrome budgets must not clip enlarged text. XP semantics belong to the full progress
track, with the decorative fill using `withAria={false}`. The accessible value contains exact XP and
next-level status, including zero progress, level available, and max level.
