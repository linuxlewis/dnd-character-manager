# Character Detail Navigation And Layout Design Spec

Last verified: 2026-09-01

Status: Proposed

## Purpose

This document defines the information architecture, subnavigation, and responsive layout for the
character detail workspace. It expands the tab concept introduced by the current inventory PR stack
into a durable shell that can hold character attributes, rolls, spells, abilities, treasury, and
inventory without turning the page into one continuously growing column.

The subject is a D&D character folio used during play. Its single job is to let a player move between
dense reference areas quickly while keeping the character's identity and immediate status in view.

This is a layout and interaction contract. Individual feature specs continue to own their rules,
data, forms, and acceptance criteria.

## Current-State Basis

- The merged character detail page loads one character in a single bordered surface. Identity,
  experience, and health are always above the tabs; the active tab currently supplies the section
  content.
- PR #73 added personal treasury presentation to character detail.
- Merged PR #78 adds client-local Mantine `Spells & Abilities` and `Inventory` tabs with
  `keepMounted={false}` so inactive inventory UI does not load. The current default is
  `Spells & Abilities`, and the tabs are not yet route-backed.
- The current placement of experience and health above every tab is retained and formalized as the
  persistent character ribbon. The remaining gaps are the route-backed section state, the default
  `Attributes & Rolls` section, and a defined place for attributes and rolls.
- This spec keeps the independently loaded section model and makes the navigation, URLs, responsive
  behavior, and persistent context explicit.

## Design Direction

### Review Brief

- **Subject:** a D&D character folio used at the table, where reference speed matters more than
  decorative immersion.
- **Audience:** a player moving between common in-session tasks on desktop, tablet, or phone.
- **Single job:** keep identity, XP, and health continuously available while making each detailed
  character area directly addressable.
- **Signature:** the persistent character ribbon joins identity and vitals into one recognizable
  band above the section navigation.
- **Explicit exclusion:** there is no Overview destination. The ribbon provides the shared context
  an Overview would otherwise duplicate.

The wireframes in this document are medium-fidelity layout references. They define hierarchy,
grouping, density, action placement, and responsive behavior. They do not prescribe exact control
widths or replace the active Mantine component styles.

### Character Folio

The page should feel like a compact digital character folio rather than an admin dashboard. Dense
rules and inventory data are the content, so the shell stays quiet and precise. It uses hierarchy,
alignment, and rules instead of nesting every subsection in another card.

The one signature element is the **character ribbon**: a persistent horizontal identity and vitals
strip that anchors every section. It echoes the header band of a paper character sheet without
imitating parchment, ornamental borders, or fantasy-themed decoration.

### Existing Visual Language

This feature preserves the established application theme rather than introducing an unrelated
redesign:

- **Obsidian:** Mantine `dark.9` page background.
- **Ink:** Mantine `dark.0` primary text.
- **Ash:** Mantine dimmed text for secondary labels.
- **Bloodstone:** the existing red primary scale for active navigation and primary actions.
- **Candle:** the existing gold accent scale for level, progress, and important derived values.

The current typography remains in place for this work. Character names use the heading role; labels
use the body role; aligned scores, modifiers, HP, currency, and slot counts use tabular numerals. A
font-system change belongs in an app-wide visual redesign, not inside this navigation feature.

| Role | Existing token | Current value | Intended use |
| --- | --- | --- | --- |
| Page | Mantine `dark.9` | `#101113` | Application background |
| Sheet | Mantine dark surface | Existing `Paper` treatment | Character ribbon and active section |
| Primary | `bloodstone.5` / `bloodstone.7` | `#f43f5e` / `#be123c` | Active navigation, primary actions, focus emphasis |
| Accent | `candle.5` | `#ffc107` | Level, progress, and selected derived values |
| Text | Mantine `dark.0` | Theme controlled | Primary names, labels, and totals |
| Secondary | Mantine dimmed | Theme controlled | Explanations, metadata, and calculation context |

### Restraint

- Use one outer character surface at most. Do not wrap every section, row, and statistic in separate
  bordered cards.
- Use dividers, spacing, and aligned columns to communicate groups.
- Reserve filled backgrounds for selected navigation, alerts, and controls that need a boundary.
- Do not add decorative dice, shields, scrollwork, gradients, or class-specific imagery to the
  navigation shell.
- Motion is limited to the existing tab indicator and disclosure transitions. Respect reduced-motion
  preferences and do not animate numeric values on initial load.

## Existing Code To Proposed Treatment

The proposal extends patterns already visible in the application and the open inventory stack. It
does not introduce a parallel design system.

| Existing implementation | Treatment in this feature |
| --- | --- |
| The app shell uses Mantine `dark.9`, `dark.0`, Inter, `radius="sm"`, and the Bloodstone primary scale. | Keep those tokens and component defaults. Do not introduce a local font, ornamental character-sheet theme, or new color family. |
| Character detail uses one bordered Mantine surface with compact `Group`, `Stack`, `Divider`, `Badge`, `Progress`, and `Button` compositions. | Keep one character-sheet surface and use spacing and dividers for internal structure rather than a dashboard grid of nested cards. |
| Experience and Health are compact, frequently used workflows near character identity. | Formalize them as the persistent ribbon so identity, XP, and the complete Health workflow remain available in every section. |
| The open inventory stack uses Mantine tabs with `keepMounted={false}` to separate `Spells & Abilities` from `Inventory`. | Expand the same subnavigation concept to three route-backed destinations while retaining independent loading and unmounted inactive content. |
| Spell slots use aligned progress, counts, and nearby actions. | Keep the existing treatment inside `Spells & Abilities`; the new shell changes placement, not the spell-slot visual language. |
| Treasury and inventory use compact summaries, filters, and detail actions. | Keep those patterns inside `Inventory` and avoid promoting item or currency state into the persistent ribbon. |

### Product-Native Design References

These are the primary implementation references for visual review:

- `src/app/theme.ts` defines Bloodstone, Candle, Inter, small radii, and compact form defaults.
- `src/domains/characters/ui/character-detail.tsx` establishes the single bordered character
  surface, identity badges, and current section-tab treatment.
- `src/domains/characters/ui/character-experience-panel.tsx` establishes compact progress and
  right-aligned numeric context.
- `src/domains/characters/ui/health-panel.tsx` establishes the complete health workflow that moves
  into the ribbon without losing Heal, Damage, Edit, or History.
- `src/domains/inventory/ui/character-inventory.tsx` establishes section-level headings, nearby
  actions, filter density, empty states, and independently loaded content.

The design should look like those pieces have been deliberately composed into a stable character
workspace. It should not look like a separate character-sheet product embedded inside the app.

### Current Screen To Proposed Screen

The latest merged screen provides the visual baseline, but the new shell intentionally changes its
hierarchy in a few visible ways:

- Remove the standalone `Character details` heading above the bordered surface. The character name
  becomes the page-level heading inside the ribbon, avoiding a generic heading that consumes vertical
  space without adding context.
- Move `Back to characters` into the top of the ribbon. It remains the first focusable control in the
  character workspace and visually belongs to the character context it exits.
- Keep one bordered character surface, but treat the ribbon, section navigation, and active section
  as three regions of that same surface. Dividers separate the regions; additional outer cards do not.
- At desktop widths, place Experience and Health side by side. The current stacked presentation is
  retained only when available width would make either progress bar or its actions cramped.
- At narrow widths, give Heal and Damage equal-width controls on one row. History may occupy a quiet
  full-width row below them so all three actions remain usable at 320 px without accidental wrapping.
- Add `Attributes & Rolls` as the selected first destination. The tab strip keeps the merged screen's
  Bloodstone active rule and subdued inactive labels, but its state is backed by the URL.
- Replace the current first-section spell content with the compact ability and roll ledgers. Spells
  remain visually unchanged in their own route-backed destination.

## Recommended Composition: Ribbon And Ledger

The recommended desktop composition is a persistent **Ribbon** above a two-column **Ledger**:

- The Ribbon carries character identity, level, experience, health, and health actions. It answers
  "which character and what is their immediate state?" before the player changes sections.
- The left Ledger column contains stable ability scores and core derived values. It remains narrow
  enough to scan vertically without turning six abilities into oversized statistic cards.
- The right Ledger column contains the searchable roll reference. It receives more width because
  roll labels, proficiency descriptions, and expanded bonus breakdowns are the denser content.
- Expanding a roll highlights its governing ability row while revealing the ordered components
  beneath the roll. This visible source trace connects a total such as `Strength save +6` to
  `Strength +3` and `Proficiency +3` without requiring the player to compare distant values.
- Editing remains a separate modal or full-screen mobile sheet. The saved view is optimized for
  quick in-session reference; the editor is optimized for changing the complete atomic data set.

This composition is the baseline because it preserves the app's current hierarchy, makes the most
common reference path fast, and gives the new calculation transparency a clear visual behavior
without making the page feel like a generic analytics dashboard.

## Alternatives Considered

### Ability Score Card Strip

A horizontal strip of six large ability cards would resemble many character builders, but it is not
the baseline for this application. It consumes the page's most valuable width, pushes the roll
reference below the fold, and collapses into a long card stack on mobile. It also visually separates
scores from the rolls they explain. Compact aligned rows preserve the same information with less
chrome and fit the existing Mantine detail-page language more closely.

### Ability-Grouped Skill Matrix

Grouping every skill directly beneath its governing ability makes the rules relationship explicit,
but it weakens the cheat-sheet task. A player looking for `Stealth`, a saving throw, or all
proficient rolls must scan across several groups, and search/filter results become fragmented. The
recommended ledger keeps one searchable roll list and uses source highlighting plus breakdowns to
show the governing ability when it matters.

## Component And Spacing Guidance

- Use one Mantine `Paper` with `withBorder` and `radius="sm"` for the character sheet surface.
- Use Mantine `Stack`, `Group`, `SimpleGrid`, and `Divider` for structure. Default to `sm` and `md`
  theme spacing; use approximately 22-24 px panel padding on desktop and 16 px below `sm`.
- Use existing `Badge`, `Progress`, and compact `Button` variants for class, level, XP, health, and
  actions. Bloodstone communicates selection and action; Candle remains a restrained accent.
- Render the section navigation with the existing Tabs treatment when it can preserve real-link
  behavior. Keep the active rule visually strong and each mobile destination approximately 44 px
  high.
- Render ability values as aligned rows. Use tabular numerals for scores, modifiers, HP, XP, spell
  slots, and currency.
- Render roll details with a semantic disclosure primitive such as Mantine `Accordion` or an
  equivalent accessible button-and-region composition. Do not put each roll in its own `Card`.
- Keep the current Inter typography and Mantine type scale. An app-wide type redesign is outside
  this feature's scope.

## Information Architecture

```text
Character detail
|
+-- Persistent character context
|   +-- Back to characters
|   +-- Character name and Edit character action
|   +-- Class and level
|   +-- Experience progress
|   +-- Health status, controls, and recent changes
|
+-- Character sections
    +-- Attributes & Rolls
    |   +-- Ability scores and modifiers
    |   +-- Proficiency bonus and core derived values
    |   +-- Roll reference and calculation breakdowns
    |
    +-- Spells & Abilities
    |   +-- Spell slots
    |   +-- Cantrips, spells, and saved abilities
    |
    +-- Inventory
        +-- Personal treasury
        +-- Item search, filters, list, and details
```

Future sections such as `Notes` or `Party` may be added only when they represent a distinct player
task. They should not be added merely to avoid making a decision about where content belongs.

## Route And Navigation Contract

Each primary character section is directly addressable:

| Section | Canonical path |
| --- | --- |
| Attributes & Rolls | `/characters/:characterId` |
| Spells & Abilities | `/characters/:characterId/spells` |
| Inventory | `/characters/:characterId/inventory` |

- The existing detail path remains canonical and renders `Attributes & Rolls`; no redirect is
  required.
- Navigation items are real links so modified click, open-in-new-tab, browser history, reload, and
  copied URLs behave normally.
- The active item uses both a visible selected treatment and `aria-current="page"` or equivalent tab
  semantics.
- Desktop labels use the full section names.
- At narrow widths, visible labels may shorten to `Rolls`, `Spells`, and `Inventory`.
  Accessible names retain the full section names.
- Switching sections preserves only server state and intentionally shared URL state. A draft modal,
  expanded row, item filter, or search query does not silently leak into another section.
- The browser back action returns to the prior section before leaving the character when section
  navigation created the prior history entry.

## Persistent Character Context

The character ribbon is visible above the section navigation on every character route. It contains
the shared character state and actions that remain useful regardless of the active section.

### Required Content

- Back link to the character roster.
- Character name.
- `Edit character` action for identity, level, and experience editing.
- Class and level.
- Total XP, progress bar, and progress toward the next level.
- Current HP over effective max HP and temporary HP.
- Health bar, Heal, Damage, and Edit actions.
- Collapsible recent health changes.

### Behavior

- The ribbon uses data already returned by the character detail query. It must not wait for the
  active section's independent query.
- Experience and Health retain their current interaction behavior inside the ribbon. They are not
  duplicated inside a navigation section.
- Health history remains subordinate to current health and collapses by default so the ribbon does
  not dominate the page during ordinary reference use.
- Below `sm`, Heal and Damage share one equal-width row. History may sit beneath them rather than
  forcing three controls onto a cramped line.
- A successful health, experience, name, or level mutation updates the ribbon through the shared
  character-detail cache.
- The ribbon may become sticky only if the app shell exposes a tested safe top offset. The initial
  implementation remains in normal document flow to avoid obscuring content on small screens.
- The ribbon never shows transient counts from independently loaded sections. Do not add item,
  spell, or proficiency badges that would force background loading.

## Section Navigation Behavior

- Use one semantic navigation component directly below the character ribbon.
- The navigation remains visible before section data finishes loading.
- Only the active section mounts and loads its independent queries, preserving the current
  `keepMounted={false}` direction.
- A section-level loading state occupies the panel area without replacing the character ribbon or
  navigation.
- A section-level failure identifies the unavailable section and provides a retry action. Other
  sections remain navigable.
- A character-level not-found or authorization failure replaces the entire ribbon and section shell
  with the existing not-found state.
- Do not show counts in section labels in the first release. Counts introduce width, stale-data, and
  background-loading problems without improving navigation.

## Desktop Shell Wireframe

Target: app content widths around 768-960 px.

```text
+------------------------------------------------------------------------------+
| <- Back to characters                                                       |
|                                                                              |
| Mira Greycastle                                      [ Edit character ]      |
| Fighter  /  Level 7                                                         |
|                                                                              |
| Experience                    Health                                         |
| 27,000 XP                     28 / 28 HP                     [ Edit ]         |
| [===========36%----------]    [==========================]                  |
| 7,000 XP to level 8           [ Heal ] [ Damage ]       [ History (2) ]     |
+------------------------------------------------------------------------------+
| [ Attributes & Rolls ] [ Spells & Abilities ] [ Inventory ]                 |
|=======================                                                       |
|                                                                              |
| Active section content                                                       |
|                                                                              |
+------------------------------------------------------------------------------+
```

The ribbon is one coherent surface. Experience and Health use balanced columns when space allows and
stack before their controls become cramped. They use quiet dividers or spacing, not nested statistic
cards. The active navigation item uses the existing Bloodstone treatment; Candle remains available
for level and progress accents.

## Attributes And Rolls Wireframe

At wide widths, stable character numbers occupy a narrow reference column and the long roll list
uses the larger column. This avoids a dashboard-like row of oversized score cards.

```text
+------------------------------------------------------------------------------+
| Attributes & Rolls                                      [ Edit attributes ]  |
|                                                                              |
| ABILITY SCORES                         ROLL REFERENCE                         |
|                                        [ Search rolls..................... ] |
| Strength      16          +3           [ All ] [ Checks ] [ Saves ] [ Other ]|
| Dexterity     14          +2                                                |
| Constitution  12          +1           Saving throws                        |
| Intelligence  10          +0           > Strength save                 +6   |
| Wisdom        15          +2           > Dexterity save                +2   |
| Charisma       8          -1           > Wisdom save                   +5   |
|                                                                              |
| PROFICIENCY BONUS          +3           Skills                               |
| INITIATIVE                 +2           > Athletics                     +6   |
| PASSIVE PERCEPTION         15           v Perception                    +5   |
|                                              Wisdom                    +2    |
|                                              Proficiency               +3    |
|                                        > Stealth                       +8   |
+------------------------------------------------------------------------------+
```

### Attribute Layout Rules

- The ability column is approximately one third of the available desktop width; the roll reference
  receives the remainder.
- Ability rows show full names, stored scores, and signed modifiers in aligned columns.
- Proficiency bonus, initiative, and passive Perception follow the ability list as compact derived
  values, not peer ability scores.
- The roll toolbar stays inside the roll-reference column. Search and filters wrap rather than force
  horizontal scrolling.
- Expanded breakdowns appear directly below their roll row so the relationship remains obvious.
- Only one breakdown needs to be open by default; multiple rows may remain open if the existing
  disclosure primitive supports it without extra state complexity.

## Spells And Abilities Wireframe

```text
+------------------------------------------------------------------------------+
| Spells & Abilities                                                           |
|                                                                              |
| Spell slots                                            [ Configure slots ]   |
| Level 1   [=== 3 / 4 ===]      [ Use ] [ Restore ]                           |
| Level 2   [===== 2 / 2 =====]  [ Use ] [ Restore ]                           |
|                                                                              |
| Cantrips & abilities                                      [ Add entry ]      |
| Light                         Cantrip                         [ Details ]      |
| Lay on Hands                 Feature                         [ Details ]      |
|                                                                              |
| Level 1 spells                                            [ Add spell ]      |
| Cure Wounds                  Prepared                        [ Details ]      |
+------------------------------------------------------------------------------+
```

- Preserve the existing spell-slot interaction and spell grouping.
- Section actions align with the heading they affect rather than collecting in a generic page
  toolbar.
- Spell lists remain full width because names and future metadata need horizontal room.

## Inventory Wireframe

```text
+------------------------------------------------------------------------------+
| Inventory                                                                    |
|                                                                              |
| Personal treasury                                                           |
| PP  2       GP  46       SP  8       CP  3       Total 66.83 GP             |
|                                      [ Add funds ] [ Spend ]                 |
|                                                                              |
| Items                                                     [ Add item ]       |
| [ Search inventory................ ] [ Type: All v ] [ Equipped: All v ]    |
|                                                                              |
| Longsword          Weapon       Equipped       Qty 1       [ View details ]  |
| Potion of Healing  Potion                      Qty 2       [ View details ]  |
+------------------------------------------------------------------------------+
```

- Treasury remains above items because it is compact and frequently referenced.
- Inventory search and filters belong with the item collection, not in the character ribbon or
  section navigation.
- Item presentation may use the responsive cards defined by the inventory feature, but cards must
  not be nested inside another decorative section card.

## Mobile Shell Wireframe

Target: 320-479 px. All primary destinations remain visible without a hidden menu.

```text
+--------------------------------------+
| <- Characters                        |
|                                      |
| Mira Greycastle                      |
| Fighter / Level 7     [ Edit ]       |
|                                      |
| Experience                           |
| 27,000 XP                            |
| [=========36%----------------]       |
| 7,000 XP to level 8                  |
|                                      |
| Health                               |
| 28 / 28 HP                 [ Edit ]  |
| [============================]       |
| [ Heal ] [ Damage ]    [ History 2 ] |
+--------------------------------------+
| Rolls      | Spells      | Inventory |
|============                          |
|                                      |
| Active section                       |
|                                      |
+--------------------------------------+
```

### Mobile Navigation Rules

- Use compact visible labels so all three destinations fit at 320 px without horizontal page
  overflow.
- Each destination retains an effective touch target of approximately 44 px high.
- If localization or user font scaling makes the labels overflow, allow the navigation strip to
  scroll horizontally and provide a visible edge cue. Do not shrink text below the app's normal
  navigation size.
- Do not replace primary section navigation with an unlabeled icon row.
- The active indicator and text treatment must remain visible without relying on hover.

## Mobile Attributes Wireframe

```text
+--------------------------------------+
| Attributes & Rolls    [ Edit ]       |
|                                      |
| Str  16  +3     Dex  14  +2         |
| Con  12  +1     Int  10  +0         |
| Wis  15  +2     Cha   8  -1         |
|                                      |
| Proficiency +3   Initiative +2       |
| Passive Perception 15                |
|--------------------------------------|
| Roll reference                       |
| [ Search rolls.................... ] |
| [ All ] [ Checks ] [ Saves ] [ Other]|
|                                      |
| Saving throws                        |
| Strength save                    +6  |
| Dexterity save                   +2  |
| Wisdom save                      +5  |
|                                      |
| Skills                               |
| Athletics                        +6  |
| Perception                       +5  |
|   Wisdom                         +2  |
|   Proficiency                    +3  |
+--------------------------------------+
```

- Ability scores become a two-column matrix when narrow-screen cells remain readable. At the
  smallest supported width or with enlarged text, they collapse to one column rather than squeeze
  labels and values together. Each cell remains a simple aligned value group, not a large tile.
- Filters wrap onto a second line if necessary.
- Roll labels and totals share one row; breakdown components indent below the label.
- Search results never hide the ability score context above them.

## Edit Attributes Wireframes

The saved page is optimized for reference. Editing uses a dedicated modal on desktop and a
full-screen modal on narrow screens so 24 proficiency controls do not compete with the roll list.

### Desktop

```text
+--------------------------------------------------------------------+
| Edit attributes                                               [x]  |
| Changes update the preview and save together.                       |
|                                                                    |
| ABILITY SCORES & SAVES              SKILL PROFICIENCIES             |
| Strength      [ 16 ]  [x] Save     Acrobatics       [None       v] |
| Dexterity     [ 14 ]  [ ] Save     Animal Handling  [None       v] |
| Constitution  [ 12 ]  [x] Save     Arcana           [Proficient v] |
| Intelligence  [ 10 ]  [ ] Save     Athletics        [Expertise  v] |
| Wisdom        [ 15 ]  [x] Save     ...                             |
| Charisma      [  8 ]  [ ] Save                                     |
|                                                                    |
| Preview: Athletics +6 / Wisdom save +5 / Passive Perception 15     |
|                                      [ Cancel ] [ Save changes ]    |
+--------------------------------------------------------------------+
```

### Mobile

```text
+--------------------------------------+
| Edit attributes                  [x] |
|                                      |
| Ability scores & saves               |
| Strength                             |
| Score [ 16 ]    [x] Save proficient  |
| Dexterity                            |
| Score [ 14 ]    [ ] Save proficient  |
| ...                                  |
|--------------------------------------|
| Skill proficiencies                  |
| Acrobatics              [None      v]|
| Arcana                  [Proficient v]|
| Athletics               [Expertise  v]|
| ...                                  |
|--------------------------------------|
| Preview                              |
| Athletics +6 / Wisdom save +5        |
|                                      |
| [ Cancel ]          [ Save changes ] |
+--------------------------------------+
```

- Mobile content scrolls as one document; the modal must not create nested scrolling regions.
- The action row may remain sticky at the bottom if it does not cover validation or safe-area
  content.
- The preview is concise. It demonstrates that calculations respond to the draft but does not
  duplicate the complete roll reference inside the editor.
- Validation appears with the field that needs correction. A persistence failure appears above the
  action row and leaves every draft value intact.

## Responsive Breakpoints

The implementation should use Mantine breakpoints rather than hard-coded device names. The intended
behavior is:

| Available width | Shell behavior |
| --- | --- |
| `< sm` | Stacked ribbon modules, compact three-item navigation, single-column panels, full-screen editors |
| `sm` to `< md` | Wrapped ribbon, full navigation labels when they fit, single-column section panels |
| `>= md` | Two-column Experience/Health ribbon, full navigation labels, two-column Attributes layout |

Exact pixel values follow the active Mantine theme. Tests should assert behavior at representative
mobile and desktop viewports rather than duplicating breakpoint constants in application code.

## Content And Action Placement

| Content or action | Location | Rationale |
| --- | --- | --- |
| Back to roster | Character ribbon | Changes character context |
| Edit name, level, XP | Character ribbon | Changes persistent identity/context |
| Heal, damage, edit HP | Character ribbon / Health | Remains available in every section |
| Edit scores and proficiencies | Attributes & Rolls heading | Acts on that complete atomic form |
| Configure/use spell slots | Spells & Abilities / Spell slots | Acts on spell-slot state |
| Add/spend currency | Inventory / Treasury | Acts on treasury only |
| Add/search/filter items | Inventory / Items | Acts on item collection only |

Do not create a global action menu containing unrelated section actions. Players should find an
action beside the information it changes.

## Accessibility Requirements

- The section navigation has an accessible label such as `Character sections`.
- Active section state is available to assistive technology.
- Full navigation names remain accessible when compact mobile labels are displayed.
- Focus order follows the visual order: ribbon, section navigation, active section heading, active
  section controls.
- A route change moves focus to the active section heading or provides an equivalent clear screen
  reader announcement.
- Keyboard users can reach every section without traversing inactive panel content.
- Navigation and disclosure state never depend on color alone.
- Touch targets remain usable at narrow widths and with browser text zoom.

## Loading, Empty, And Error States

- **Character loading:** show one shell-level loading surface before identity is available.
- **Section loading:** retain the loaded ribbon and navigation; show loading only in the panel.
- **Section empty:** explain what belongs in the section and provide its primary creation or edit
  action, such as `Add your first item`.
- **Section failure:** name the failed area and offer `Try again`; do not replace working character
  context with a generic page failure.
- **Mutation failure:** keep the user in the active section, preserve drafts when applicable, and
  place the error beside the failed workflow.
- **Not found:** use the existing character-not-found state with a path back to the roster.

## Implementation Guidance

- Extend the character route type with a section concept rather than keeping tab selection only in
  component-local state.
- Keep the character ribbon and subnavigation in a focused shell component. Section components own
  their data queries and interactions.
- Preserve normal link behavior through the existing route-link helpers.
- Use generated TanStack Query helpers for section data. Do not prefetch every section solely to
  populate navigation.
- Do not use `useEffect` to synchronize route state and tabs. Derive the active section from the
  parsed route and navigate from link event handlers.
- The current `Tabs` primitive may remain if it can render route-backed links and accessible active
  state. Otherwise use a semantic local navigation with the same Mantine visual treatment.
- Section modules should not import sibling UI modules. Compose them from the character shell.

## Validation And Acceptance

- All three sections are directly addressable and survive reload.
- Browser back and forward traverse section history correctly.
- Modified clicks retain native browser behavior.
- Only the active independently loaded section issues its section-specific requests.
- Character identity, HP, and XP remain visible while moving between sections.
- At 320 px, the ribbon, navigation, content, and actions render without page-level horizontal
  overflow.
- At desktop width, the ribbon and Attributes use their intended two-column layouts.
- Keyboard and screen-reader users can identify and change the active section.
- A section query failure does not prevent navigation to another working section.
- The current health, spell, treasury, and inventory e2e journeys continue to reach their controls
  through the new section paths.

### Visual Review Checklist

Use these questions when reviewing implementation screenshots or a running build:

1. Does the ribbon read first as one persistent identity-and-vitals band, with Health as complete
   and actionable as it is today?
2. Is `Attributes & Rolls` clearly the default destination without implying a missing Overview?
3. Can a player connect a roll total to its ability and proficiency sources without scanning
   distant cards or opening an editor?
4. Does the page feel denser and more useful than a dashboard while remaining calmer than a
   traditional ornamental character sheet?
5. At 320 px, can the player read HP, use every health action, change sections, search rolls, and
   expand a breakdown without horizontal page scrolling?

## Product Decisions

- There is no Overview section. Experience and the complete current Health workflow remain in the
  persistent character ribbon above every section.
- `Attributes & Rolls` is the default character section and keeps the existing character-detail URL.
- Primary section state belongs in the URL, not only in local React state.
- `Attributes & Rolls` is the full desktop label; `Rolls` is the compact mobile label.
- The shell favors dense, aligned reference data over a collection of large dashboard cards.
- The character ribbon is the single distinctive structural device; the rest of the layout remains
  restrained and consistent with the existing Mantine theme.
