# Personal Inventory Activity Specification

Status: Approved
Scope: Personal character inventory and treasury
Target milestone: M2.1 Personal Inventory Activity, after A7 and before party activity UI

## Purpose

Add an immutable, user-visible activity log for changes to a character's personal inventory
scope. The feature covers both owned items and personal treasury changes. It must use the same
`inventoryScopeId` boundary already used by items and treasury so the later party activity feature
can reuse the persistence and presentation layers without copying data models.

This is an extension to the initial personal inventory release. It does not add undo, rollback,
real-time collaboration, or transfers between personal and party scopes.

## Existing Manager Behavior

The existing D&D Inventory Manager implements the following behavior in its working code:

- Appends an immutable history row for `item_added`, `item_updated`, `item_removed`, and
  `currency_updated`.
- Stores an inventory identifier, action, entity type, optional entity ID/name, JSON details, and
  a creation timestamp.
- Records treasury changes as denomination-level before/after pairs and preserves an optional note.
- Provides a paginated history endpoint with action and entity-type filters, newest-first ordering,
  and a total count.
- Shows the newest entry in a compact `Recent Activity` card and opens a right-side `Activity Log`
  drawer containing the recent entries.
- Uses action colors, item-type/currency icons, readable descriptions, relative timestamps, and
  formatted currency/item details.

Useful behavior to preserve:

1. An activity entry is created only after a successful state change.
2. Deleted items retain their name and useful item details in the log.
3. Treasury notes are displayed with the corresponding currency change.
4. The history list is newest-first and supports more than the preview page.

Behavior not to copy:

- The existing manager commits the treasury mutation and history row in separate transactions.
  This app must write both in one database transaction so a history failure cannot leave an
  unlogged balance change.
- Its production UI has no focused history component tests or end-to-end history journey.
- Its product requirements describe undo and rollback, but the working implementation does not
  provide them. They remain explicitly out of scope here.

## Current Character Manager State

The current app already has the persistence foundation from A5/A6:

- `inventory_history_entries` is keyed by `inventory_scope_id`.
- Personal item create, update, delete, equip, and unequip operations append history atomically
  with the item mutation.
- History rows are listed newest-first with deterministic `createdAt` and `id` ordering.
- The repository returns `total`, `limit`, `offset`, and `hasMore`.
- The shipped spend modal presents four whole-number inputs for PP, GP, SP, and CP. Its
  `toSpendTreasuryRequest` mapper sums those inputs in copper, then collapses the total to the first
  representable denomination in PP-to-CP order for the single-denomination spend API request. The
  four-input draft is UI state, not a four-denomination API contract.

The current gaps are:

- Character treasury mutations do not append history.
- There is no character-authorized history service or route.
- The history request types do not expose action/entity filters.
- There is no activity query, recent preview, drawer, formatter, or error state in the personal
  inventory UI.
- Item mutations do not invalidate a history query because no history query exists yet.
- A6 currently records an `item_updated` row for a syntactically valid no-op update; the activity
  implementation must suppress history for updates that leave every persisted value unchanged.
- Treasury add/spend requests do not carry the optional note through the current API contract.
- History `details` is currently an unstructured JSON object. New entries need a typed, versioned
  shape while remaining readable for existing rows.

## Goals

- Let a player inspect recent and older changes to one character's personal items and treasury.
- Make add, spend, convert, item, equip, and delete activity readable without opening the item
  detail view.
- Preserve the current client-side treasury preview and one-step submission flow.
- Write each successful state mutation and its history entry atomically.
- Keep personal and party activity scoped by the same inventory scope abstraction.
- Keep history failures isolated from unrelated character sections in the UI.
- Make the feature manually testable and protected by unit, integration, route, and e2e tests.

## Non-Goals

- Undoing one entry or rolling back to a prior point.
- Editing or deleting history entries.
- Moving items or currency between personal and party scopes.
- Real-time activity updates or server-sent events.
- Audit-grade actor identity UI for the personal view.
- Reconstructing missing historical treasury changes that occurred before this feature ships.

## Domain Model

### History Entry

Keep the existing row identity and scope columns:

| Field | Type | Requirement |
|---|---|---|
| `id` | UUID | Primary key; generated by Postgres |
| `inventoryScopeId` | UUID | Required scope boundary and foreign key |
| `action` | enum | `item_added`, `item_updated`, `item_removed`, `currency_updated` |
| `entityType` | enum | `item` or `currency` |
| `entityId` | UUID nullable | Item ID for item events; null for currency |
| `entityName` | text nullable | Item name snapshot; null for currency |
| `details` | JSONB | Versioned action-specific payload |
| `createdAt` | timestamptz | Server-generated event time |

Recommended forward-compatible addition:

| Field | Type | Requirement |
|---|---|---|
| `actorUserId` | UUID nullable | Authenticated user who caused the mutation; null for imported legacy rows |

Add `actorUserId` now, even though the personal UI does not need to display it. Party activity will
otherwise require a second history-table migration when multiple party members begin writing to the
same scope. Use `ON DELETE SET NULL` so deleting a user does not delete activity history.

The existing scope-created index remains the primary list index:

```text
(inventory_scope_id, created_at DESC, id DESC)
```

### Canonical Details Payloads

New writes use `version: 1`. The action and entity columns remain the primary discriminator so
consumers can reject inconsistent rows at the boundary.

#### Item Added or Removed

```json
{
  "version": 1,
  "item": {
    "id": "uuid",
    "name": "Potion of Healing",
    "type": "potion",
    "category": "Potions",
    "rarity": "common",
    "quantity": 2,
    "weight": 0.5,
    "estimatedValue": 50,
    "isEquipped": false
  }
}
```

The snapshot is intentionally smaller than a full owned item. It must retain enough data to render
the event after an item is deleted or the catalogue becomes unavailable.

#### Item Updated

```json
{
  "version": 1,
  "before": { "id": "uuid", "name": "Longsword", "quantity": 1 },
  "after": { "id": "uuid", "name": "Longsword", "quantity": 2 },
  "changedFields": ["quantity"]
}
```

The before/after snapshots should contain the displayable item fields used by the formatter. The
writer may retain the current full snapshots temporarily, but the public mapper must normalize them
to this contract and omit technical fields such as timestamps, catalogue payloads, and internal
scope IDs from the rendered change summary.

Equip and unequip remain `item_updated` events. The formatter recognizes an `isEquipped`-only
change and renders `Equipped <name>` or `Unequipped <name>` instead of a generic update.

#### Currency Updated

```json
{
  "version": 1,
  "operation": "spend",
  "previous": { "cp": 0, "sp": 0, "gp": 0, "pp": 2 },
  "next": { "cp": 0, "sp": 0, "gp": 5, "pp": 0 },
  "delta": { "cp": 0, "sp": 0, "gp": 5, "pp": -2 },
  "requested": { "amount": { "denomination": "gp", "amount": 15 } },
  "note": "Bought climbing gear"
}
```

`operation` is `add`, `spend`, or `convert`.

- `add`: `requested.delta` contains the four submitted nonnegative denominations.
- `spend`: `requested.amount` contains the submitted denomination and positive coin count, such
  as `{ "denomination": "gp", "amount": 15 }`. This is the single-denomination request produced
  by the current four-input UI mapper, not the raw four-field draft. The stored `delta` reflects the
  actual normalized balance change, including making change.
- `convert`: `requested` contains `{ "from": "pp", "to": "gp", "amount": 1 }`.
- `previous` and `next` are authoritative server balances.
- `delta` is `next - previous` per denomination and may contain positive values during a spend
  because a higher denomination was broken.
- `note` is nullable, trimmed, and capped at 500 characters. Blank notes are stored as null.

All balances remain integers. Total GP value is derived with the shared currency conversion helper,
not trusted from client input.

### Compatibility

The read mapper must accept existing unversioned item details and older imported details while new
writes use version 1. Do not delete or rewrite existing activity rows as part of this feature.
The future legacy importer should normalize old `changes: { old, new }` currency details and item
detail objects into the version 1 contract at import time, retaining the original source metadata
in importer-owned fields if needed.

## Transaction Semantics

Every successful mutation creates at most one history entry:

- Add item: one `item_added` entry.
- Edit item: one `item_updated` entry only when a value changes.
- Equip/unequip: one `item_updated` entry only when the state changes.
- Delete item: one `item_removed` entry, written in the same transaction as the delete.
- Add funds: one `currency_updated` entry.
- Spend funds: one `currency_updated` entry.
- Convert funds: one `currency_updated` entry when conversion remains an exposed mutation.

No history entry is created for:

- A preview request.
- A rejected validation, insufficient-funds, or authorization request.
- A stale-preview conflict where the mutation is not applied.
- A no-op item update, equip, unequip, or zero-value currency mutation.

Treasury persistence and history insertion must share the same transaction. If the history insert
fails, the balance update rolls back and the API returns the existing mutation failure mapping.
The actor user ID and optional note are passed from the authorized service into the transaction;
the history repository must not independently resolve authorization.

## API Contract

Add a character-authorized route:

```text
GET /api/characters/:characterId/history
```

Query parameters:

| Parameter | Type | Default | Requirement |
|---|---|---:|---|
| `limit` | integer | 20 | 1 through 100 |
| `offset` | integer | 0 | Nonnegative |
| `action` | enum nullable | null | Optional action filter |
| `entityType` | enum nullable | null | Optional `item` or `currency` filter |

Response:

```json
{
  "entries": [],
  "total": 12,
  "limit": 20,
  "offset": 0,
  "hasMore": false
}
```

The handler must authorize the character before resolving its inventory scope. A character with no
created scope returns an empty page rather than exposing or creating an internal scope. Scope IDs
are never accepted as public authorization boundaries.

The generated OpenAPI document and client are part of the same change. Invalid query values use the
existing typed validation/error conventions.

Treasury add and spend requests gain an optional `note` field. Preview routes do not need to store
or return the note, but the final mutation request must carry the exact trimmed note that will be
written to history. Convert requests should accept the same note if conversion remains available
through the public character API.

## UI Specification

### Design Brief

Subject: a D&D player's personal record of changes to carried gear and money.

Audience: a player checking a character during or immediately after play, usually on a phone or a
laptop with limited attention available.

Single job: answer `What changed in this character's inventory?` without making the player inspect
individual items or recalculate treasury balances.

The existing D&D Inventory Manager is the interaction baseline. Preserve its successful structure:

- a compact `Recent Activity` preview between treasury and items;
- one newest entry in the preview;
- a right-side activity panel for the full list;
- item-type and currency icons;
- action-specific colors;
- readable descriptions, notes, and relative timestamps.

Do not copy its presentation literally. Its nested dark cards, tiny type, undifferentiated entry
list, and raw currency delta strings become difficult to scan. This app should retain the familiar
flow while presenting activity as a restrained adventurer's field ledger inside the existing
Mantine design system.

### Visual Direction

The activity UI uses a `field ledger` concept: entries are chronological marks connected by a
single vertical rail. Order is meaningful, so the rail encodes real information rather than acting
as decoration. Each event sits on a compact square seal containing the same Lucide item-type or
currency icon used elsewhere in the inventory UI.

This rail is the one visual signature. Do not add parchment textures, ornamental fantasy borders,
oversized gradients, glass effects, or multiple competing card treatments. The feature should feel
specific to an adventurer's inventory while remaining part of the current application.

#### Palette

Use existing Mantine theme values or their nearest built-in equivalents. No new global palette is
required.

| Token | Hex | Use |
|---|---|---|
| `Ledger ink` | `#1A1B1E` | Drawer and dark surface foundation |
| `Ledger panel` | `#25262B` | Preview and entry surfaces |
| `Ledger rule` | `#373A40` | Borders, separators, and the quiet timeline rail |
| `Candle` | `#FFC107` | Treasury identity and focused accents |
| `Verdigris` | `#20C997` | Added and equipped states |
| `Bloodstone` | `#F43F5E` | Removed and spent states |

Use Mantine blue for neutral item edits. Color supports the action icon and important signed value;
it must not tint the entire entry body. Treasury always retains a candle-colored coin icon while
positive and negative amounts use verdigris and bloodstone respectively.

#### Typography

Preserve the existing application typography rather than introducing a one-off font family.

- Section title: current heading family, 700 weight, approximately `18/24`.
- Entry summary: current body family, 600 weight, approximately `14/20`.
- Entry detail: current body family, 400 weight, approximately `13/18`, dimmed.
- Date group and utility labels: 600 weight, approximately `11/16`, restrained uppercase with
  increased letter spacing.
- Currency values, quantities, and before/after values use tabular numerals.

Do not reduce activity copy to the legacy manager's `10px` and `11px` sizes. The minimum functional
text size is the current Mantine `xs`; summaries use `sm` or larger.

### Placement and Page Hierarchy

On the character detail `Inventory` tab, render the compact activity preview after the treasury
panel and before the personal inventory panel. Do not add another character-level tab.

```text
+------------------------------------------------------------+
| Treasury                                      Add | Spend   |
| [ CP ] [ SP ] [ GP ] [ PP ]   Total GP value               |
+------------------------------------------------------------+

+------------------------------------------------------------+
| Recent activity                                 View all > |
| [seal] Spent 15 GP                         6 minutes ago    |
|        5 GP remaining                                      |
|        "Bought climbing gear"                              |
+------------------------------------------------------------+

+------------------------------------------------------------+
| Personal inventory                          12 items | Add  |
| Search, filters, and item cards                              |
+------------------------------------------------------------+
```

The preview is a separate bordered `Paper`, matching the current small-radius tool surfaces. It is
not nested inside the treasury or personal inventory `Paper`, and it does not repeat the character
name or the `Inventory` tab label.

### Recent Activity Preview

The preview preserves the existing manager's one-entry approach. Showing more than one entry would
turn the page section into a second history list and push the item controls below the fold.

#### Header

- Left label: `Recent activity`, with a `History` icon at the same visual weight as other section
  icons.
- Right action: `View all` plus a right chevron.
- In ready and empty states, the whole surface may be one accessible `UnstyledButton` or
  button-like `Paper`; do not place a second interactive button inside it. In the error state,
  render `Retry activity` as a separate control rather than nesting it inside that surface.
- Accessible name: `View inventory activity`.

#### Latest Entry

- Use the same entry formatter and event seal as the drawer.
- Show the summary, at most one compact detail line, an optional note, and relative time.
- Clamp the detail and note to one line each in the preview. The drawer retains the full content.
- On desktop, time aligns to the right of the summary. On mobile, time moves beneath the summary so
  it never compresses the item name or currency amount.
- The preview does not show the timeline rail because only one event is present.

#### Preview States

| State | Presentation |
|---|---|
| Loading | Preserve the preview's approximate height with one seal skeleton and two text lines |
| Empty | `No activity yet` with `Changes to items and treasury will appear here.`; omit `View all` |
| Error | `Activity unavailable` with `Retry activity`; treasury and item controls remain usable |
| Ready | Newest entry only, newest-first from the same query boundary used by the drawer |

### Activity Drawer

Use a Mantine `Drawer` so the player keeps the character page as context, matching the existing D&D
Inventory Manager interaction.

- Desktop: right side, approximately `440-480px` wide. Do not exceed a comfortable single-column
  reading width.
- Mobile: full viewport width with safe-area padding and no horizontal overflow.
- Title: `Inventory activity`.
- Optional subtitle: the character name in dimmed `sm` text. Do not repeat class or level.
- Header and filter controls remain visible while the activity list scrolls.
- Close control uses the standard Drawer close button and keyboard behavior.

```text
                                  +--------------------------------------+
                                  | Inventory activity              [x] |
                                  | Arannis                               |
                                  | [ All ] [ Items ] [ Treasury ]        |
                                  |--------------------------------------|
                                  | TODAY                                 |
                                  |   [coin]-- Spent 15 GP        2:14 PM |
                                  |      |    5 GP remaining                  |
                                  |      |    "Bought climbing gear"      |
                                  |      |                                |
                                  |   [sword]- Equipped Longsword  1:58 PM|
                                  |      |    Armor class and damage...   |
                                  |      |                                |
                                  | YESTERDAY                             |
                                  |   [bag]--- Added Bag of Holding        |
                                  |           Uncommon | x1               |
                                  |                                      |
                                  |              [ Load more activity ]   |
                                  +--------------------------------------+
```

#### Filters

- Use one full-width Mantine `SegmentedControl`: `All`, `Items`, `Treasury`.
- Default to `All` whenever the drawer is opened for a different character.
- Preserve the selected filter while the same drawer remains open.
- Filter changes reset offset to zero and replace the visible list after loading.
- Do not show filter counts unless the API can provide all three counts without additional list
  requests.

#### Date Groups and Ordering

- Entries remain newest-first.
- Group visible entries by the player's local calendar date: `Today`, `Yesterday`, then a localized
  short date such as `Aug 29`.
- Date labels are structural headings for assistive technology, not decorative captions.
- Pagination appends to the current final date group without duplicating its heading.
- Stable entry keys use history IDs. The deterministic server order remains `createdAt`, then `id`.

#### Loading and Pagination

- Initial loading uses four ledger-row skeletons with the rail position preserved.
- `Load more activity` is a full-width light button after the last entry when `hasMore` is true.
- While loading more, keep existing entries visible and show two skeleton rows beneath them.
- A load-more failure keeps existing entries visible and replaces the button with `Try loading more`.
- Do not infinite-scroll; the explicit button makes data loading understandable and keyboard
  accessible.

### Activity Entry Anatomy

Each drawer entry is a two-column grid: a `32px` rail/seal column and a flexible content column.

```text
[seal]  Summary                                  relative time
  |     Primary detail or before -> after value
  |     Optional note
  |     Optional secondary changed-field detail
```

- The quiet `Ledger rule` rail runs behind seals within a date group and stops after the final
  entry. It must not continue through date headings.
- Seals use `radius="sm"`, not circles, matching inventory thumbnails and tool surfaces.
- The seal background remains dark; action color appears on its border and icon.
- Entry bodies are not individual bordered cards. Separation comes from spacing, the rail, and date
  groups, avoiding the legacy manager's card-within-card density.
- Relative time is visible. The `<time>` element exposes the full localized timestamp through its
  accessible label and a tooltip on pointer hover/focus.
- Item and currency names remain plain text in M2.1; entries do not navigate to item details because
  deleted items may no longer exist.

### Event Presentation

Preserve the legacy manager's icon and tone mapping, refined to distinguish treasury operations and
equip state:

| Event | Seal icon | Tone | Summary |
|---|---|---|---|
| Item added | Item type icon | Verdigris | `Added <name>` |
| General item edit | Pencil | Blue | `Updated <name>` |
| Equipped | Item type icon or sword | Verdigris | `Equipped <name>` |
| Unequipped | Item type icon or sword | Blue | `Unequipped <name>` |
| Item removed | Item type icon, fallback trash | Bloodstone | `Removed <name>` |
| Treasury add | Coins | Candle with positive value | `Added <requested amount>` |
| Treasury spend | Coins | Candle with negative value | `Spent <requested amount>` |
| Treasury convert | Coins | Candle | `Converted <amount> <from> to <to>` |

Use the owned item snapshot to choose the item type icon, rarity label, quantity, weight, and value
even after deletion. Fall back to `Package` only when compatibility parsing cannot identify a type.

### Item Detail Copy

The first detail line should explain the highest-value change rather than dump every changed field.

- Added or removed: `Uncommon | x2 | 0.5 lb | 50 GP`, omitting missing and default values.
- Quantity-only edit: `Quantity 1 -> 2`.
- Name-only edit: `Longsword -> Moon-Touched Longsword`.
- Equipped or unequipped: item type and category, for example `Weapon | Martial melee`.
- General edit: show at most two changed fields as `Weight 3 lb -> 4 lb`; when more changed, append
  `+2 more changes`.
- Notes changed: never place the full note in the summary. Show `Notes updated` and expose the new
  note only if it is safe, short, and part of the typed public history payload.

Use the Unicode arrow only if the surrounding source file already uses it; implementation may use
an ASCII arrow or visually hidden separator to follow repository text conventions.

### Treasury Detail Copy

Treasury entries describe the requested action first and the authoritative result second. This
avoids the existing manager's ambiguity when a spend breaks a higher denomination.

Examples:

```text
Added 2 GP and 5 SP
Balance: 10 GP -> 12 GP 5 SP
"Reward from the guild"
```

```text
Spent 15 GP
Balance: 2 PP -> 5 GP
"Bought climbing gear"
```

```text
Converted 1 PP to 10 GP
Balance: 2 PP 3 GP -> 1 PP 13 GP
```

- The summary uses the submitted `requested` amount, not the normalized denomination delta.
- The detail uses authoritative `previous` and `next` balances and omits zero denominations.
- The preview may shorten the detail to `<formatted next balance> remaining` when the full
  before/after line does not fit.
- Notes appear as a separate dimmed line with quotation marks. Preserve user punctuation, trim
  whitespace, and clamp to two lines in the drawer.
- Do not render a list such as `-2 PP, +5 GP` as the only spend explanation; it is mathematically
  correct but does not clearly state that the player spent `15 GP` and received change.
- Screen-reader text includes the denomination names, while visible text may use `CP`, `SP`, `GP`,
  and `PP`.

### Drawer States

| State | Presentation |
|---|---|
| Empty, all | `No activity yet` and `Changes to items and treasury will appear here.` |
| Empty, filtered | `No item activity` or `No treasury activity`; include `Show all activity` |
| Initial error | Activity-scoped alert with `Retry activity`; drawer remains closable |
| Malformed row | Keep the date group and show `This activity entry cannot be displayed.` with time |
| Partial page error | Keep loaded entries and show retry at the pagination boundary |

### Responsive Behavior

- At widths below the current Mantine `sm` breakpoint, the drawer becomes full width.
- Entry summary, amount, and item name get the first line; relative time moves below them.
- Before/after treasury balances wrap at denomination boundaries rather than overflowing.
- Filter labels remain full words; do not replace `Treasury` with an unexplained icon.
- Touch targets for the preview, close button, filters, and load-more action meet a minimum `44px`
  interactive height.
- The timeline rail remains visible on mobile but its column narrows to `28px`.

### Motion and Focus

Use the standard Mantine Drawer transition as the only entrance animation. Do not stagger every
history row. On successful query refresh, the newest changed row may receive a brief candle-tinted
background fade to help the player connect a just-completed mutation to the log; omit this behavior
if it complicates reduced-motion support.

- Respect `prefers-reduced-motion`.
- The preview has a visible keyboard focus ring around the complete surface.
- Opening the drawer moves focus to its heading or close control according to Mantine behavior.
- Closing returns focus to the activity preview.
- Segmented controls and pagination remain keyboard operable.

### Cache and Failure Behavior

- Recent and drawer queries use a character-scoped history key with a shared invalidation prefix.
- Item mutation success invalidates history after the response is accepted.
- Treasury mutation success invalidates history after the existing reconciliation settles. Do not
  optimistically insert an entry because an indeterminate response may already have committed on
  the server.
- Failed, conflicted, or unapplied mutations do not create optimistic history entries.
- History query failures show an activity-specific retry path and do not prevent personal treasury,
  item search, or item mutations from rendering.

### Approved UI Review Decisions

These choices are approved for H4 implementation:

1. Keep exactly one latest entry in the page preview.
2. Use a right-side drawer on desktop and full-width drawer on mobile.
3. Use the vertical field-ledger rail rather than bordered cards for each full-history entry.
4. Group entries by local date.
5. Show treasury requested action plus before/after balances instead of raw denomination deltas.
6. Keep activity entries informational and non-navigable in M2.1.

## Implementation Packages

The following packages are intentionally separable for delegated coding work:

### H1. Typed History Details and Repository Read API

- Add action-specific Zod details schemas and compatibility parsing.
- Add `actorUserId` persistence.
- Extend history repository pagination with action/entity filters.
- Keep scope isolation and deterministic ordering.
- Add repository and mapper tests.

### H2. Atomic Treasury Activity Writes

- Add note fields to treasury mutation contracts and UI request mapping.
- Pass operation, requested input, previous/next balances, delta, note, and actor into the treasury
  transaction.
- Insert one history entry before transaction commit.
- Add rollback, no-op, rejected mutation, and making-change integration tests.

### H3. Character History Route and Generated Client

- Add the authorized character history service and route.
- Resolve character ownership before scope access.
- Regenerate and verify OpenAPI/client artifacts.
- Add route authorization, filters, pagination, empty-scope, and response-boundary tests.

### H4. Personal Activity UI

- Add recent activity card and full drawer using current Mantine patterns.
- Add action/entity filters, loading/empty/error states, formatters, and retry behavior.
- Invalidate activity queries from item and treasury mutation paths.
- Add focused component tests.

### H5. Personal Activity User Journey

- Add a separate `tests/e2e/character-inventory-activity.spec.ts`.
- Verify item add/edit/equip/unequip/delete activity, treasury add/spend notes, change-making detail,
  newest-first ordering, filters, refresh persistence, and load-more behavior.
- Verify rejected spend and preview requests do not create entries.
- Verify a second character cannot see the first character's history.

## Manual Acceptance Script

Use a character with an empty activity log:

1. Open the character's `Inventory` tab and confirm the recent activity empty state.
2. Add a catalogue item and a custom item. Confirm two readable `Added` entries.
3. Edit the custom item's quantity and equip/unequip the equipment item. Confirm readable update,
   equip, and unequip entries.
4. Add mixed treasury denominations with a note. Confirm one treasury entry showing the note and
   net value.
5. Spend an amount that requires making change with a different note. Confirm the entry describes
   the requested spend and resulting denomination changes.
6. Attempt to overspend. Confirm the balance and activity count do not change.
7. Open the full drawer, switch between All, Items, and Treasury, and confirm counts/content update.
8. Create enough entries to require a second page, use `Load more`, and verify no duplicate entries.
9. Refresh the character and confirm the latest activity and balances persist.
10. Open another character and confirm its activity log is independent.

## Automated Acceptance Gate

Before the milestone is shippable:

- `pnpm lint`
- `pnpm test:unit`
- Focused history repository/service/route integration tests
- `pnpm test:integration`
- `pnpm test:e2e` including `character-inventory-activity.spec.ts`
- `pnpm build`
- `pnpm api:check`
- `git diff --check`

The milestone is complete only when the manual script works against a running stack and the e2e
journey covers the same user-visible behavior.
