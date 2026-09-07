# Mobile workspace implementation

The acceptance contract is [mobile-character-workspace-spec.md](./mobile-character-workspace-spec.md).
The visual rules are [ui-design.md](./ui-design.md). This note records the implemented seams so later
agents can change one concern without duplicating app chrome or keeping inactive data requests alive.

## Ownership and composition

- `App` subscribes to browser pathname changes through `providers/navigation`. The provider owns only
  browser history notifications; character route parsing stays in the character UI layer.
- `CharacterWorkspace` parses the pathname and owns per-character inventory view state and section
  scroll positions for its mounted lifetime. A reload starts a fresh view; navigation between sections
  and returning from the roster retains state. Auth/server data still belongs to TanStack Query.
- `CharacterDetail` owns the sticky header container, active section mount, and section navigation.
  Its header contains `CharacterRibbon` and `CharacterHealthPanel` exactly once. The two destination
  links are a single responsive navigation element, not duplicate desktop/mobile trees.
- `CharacterRibbon` receives the typed character and `onNavigate`, plus `renderApplicationMenu`.
  The latter is an app-owned render callback accepting character action menu items. The app supplies
  sign-in/account, About attribution, and Privacy. Character code supplies its edit/history actions.
  The callback's optional second argument is a ref for the persistent menu trigger. Menu-launched
  dialogs return focus to that ref when closing because the originating menu item unmounts. The
  details-to-editor flow instead returns to character identity. Preserve these explicit close
  callbacks when composing dialogs; Mantine cannot restore focus to a removed menu item.
- Inventory receives optional `InventoryViewState` (`searchInput`, `activeType`) and
  `onViewStateChange`. Standalone inventory retains its local fallback; the workspace supplies both
  props for preservation across section unmounts. Editor drafts and selected detail dialogs are local.

## Navigation and layout

`/characters/:id` aliases Spells. The navigation links use `/characters/:id/spells` and
`/characters/:id/inventory`. Ordinary clicks push history and notify subscribers; modified clicks
remain native browser behavior. Back/forward uses the same pathname subscription. Only the active
section renders its queries. `section-scroll` records scroll events and uses a callback-ref-owned
ResizeObserver to restore after asynchronous content grows; cleanup releases all listeners. Wheel,
touch, or keyboard interaction cancels pending restoration so the player remains in control.

App-level CSS owns `.character-sticky-header` and `.character-section-navigation`: sticky header
z-index 20, navigation 30, below Mantine overlay defaults. Mobile navigation is 64px excluding the
bottom safe area, which is applied once on navigation. Content reserves 80px plus that safe area.
The header flows normally below 500px viewport height. Breakpoint is Mantine `sm` (48em). Header
identity and health contents are separately owned; their combined mobile target is at most 144px.

## Extending sections

Future Rolls requires an explicit route/parser addition, navigation registry entry, and active-panel
branch in `CharacterDetail`, plus loading/error/query-isolation and three-destination responsive
coverage. Do not add dormant links, routes, queries, or attributes imports now. Preserve existing
Spells canonical URLs and default while introducing a future destination. Additional view state
must be typed, scoped by character and section, and limited to committed browsing preferences.

## Spell workflows

`CharacterSpellConfiguration` owns configuration drafts and mutations. `SpellConfigurationModal`
owns validation and focus. Slot totals leave the default workspace view and appear through Edit
spells > Configure slots. The mobile editor is fullscreen; desktop uses a bounded modal. Its fields
are the only scrolling region, while Cancel and Save changes stay in a separate persistent footer.
Preserve the parent-qualified CSS selectors: Mantine's modal body rules otherwise override sizing
and can push the footer outside the viewport. Failed saves retain draft totals. Class defaults still
save immediately, with explicit explanatory text; this action does not become a staged draft.

Saved spell rows preserve Details, Use, and Restore in the default view. Edit spells reveals removal
and configuration. Use/Restore use intrinsic-width buttons so Restore cannot be clipped at 320px.
Search and detail dialogs are fullscreen on mobile. Add requests block duplicate saves and dialog
closure while pending; mutation failures appear inside the active dialog.

## Acceptance evidence

Spell candidate captures and their source/fixture metadata live in
`work/design-review/mobile-workspace/spells-candidate/manifest.json`. These are implementation
evidence, not approved visual baselines. Final QA owns the integrated matrix, error readability,
focus/hit testing, text scaling, and source-matched approval. Updating a baseline requires explicit
review of the new screenshots against the spec and design rules.
