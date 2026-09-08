# UI Design And Interaction Contract

Last verified: 2026-09-07
Status: Durable contract implemented and independently reviewed in the mobile refactor review stack.
The [acceptance record](./mobile-workspace-acceptance.md) identifies tested source, evidence, final CI
status and outstanding physical-device checks. Not merged or deployed. The spec baseline is main
`faf5192`; future features must preserve this contract and add their own acceptance evidence.

## Product Character

This is a working D&D character sheet for players using a phone during play. Identity, XP and HP
orient the player; usable spells and inventory are the page's job. Prefer readable numbers and
clear actions over branding, nested cards, decorative dividers, and explanatory paragraphs.
Retain the existing dark Mantine palette, bloodstone selection/action accent, candle XP accent,
Inter type and small radii. Selected navigation uses bloodstone.3 text and bloodstone.5 rule; XP
uses candle.4. These exact existing-palette tones were accepted during independent review. Main uses Mantine's default dark scale; do not import a custom scale
from an unmerged branch. Numerical HP/XP/currency use tabular figures. No decorative count-ups.

## Stable Interaction Rules

- Character detail has compact identity/XP/health and mobile bottom navigation below `sm`.
  Spells and Inventory are the only shipping destinations; default is Spells. Desktop uses top
  navigation. No duplicate top/bottom tabs on a phone. The roster and privacy page retain site chrome.
- Identity has a visible chevron and opens exact character details with a prominent Edit character
  action. Edit Save/Cancel/Escape returns to details and focuses Edit character; closing details
  focuses identity. Only one dialog is mounted at a time in this flow. HP opens health editing.
- Health history is a direct 44 x 44 px minimum action beside Heal and Damage, available in one
  tap during battle. Its icon has the accessible name Health history; show History text where
  space permits. Closing history restores its trigger, section and scroll position.
- The person icon opens an account menu containing no character actions. App-owned account/sign-in,
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

## Workspace Field Boundaries And Helper Text

Workspace controls need visible boundaries: neutral input borders use `#858585`, exceeding 3:1
against the field (`#2e2e2e`) and editor (`#242424`) surfaces. Error, focused, and disabled controls
retain Mantine's semantic styling. Do not replace the error border with the neutral boundary.
Helper text and placeholders inherit `dark.1` within the workspace instead of the lower-contrast
default dimmed token. Labels remain visible; placeholders do not replace labels.

The scope is `.character-workspace` and the portaled form containers `.workspace-inputs`,
`.inventory-editor-form`, and `.spell-editor-form`. Add `workspace-inputs` to new workspace dialog
content containers so portaling does not lose these roles. This is an opt-in workspace contract,
not a global application theme change. Validate computed text, field, and surrounding surface
colors in both unfocused and focused/error states when adding controls.
