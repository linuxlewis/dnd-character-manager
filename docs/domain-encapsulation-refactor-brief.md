# Domain Enforcement And Feature Encapsulation Refactor

Prepared: 2026-09-07

Status: orchestration started; R0 documentation submitted for review.

## Task For The Implementing Agent

Implement the architectural foundation for smaller functionality domains before
the attributes stack merges. Work from current `origin/main` in an isolated
worktree on a `codex/` branch. Deliver working code, tests, updated guidance, and
reviewable draft PRs. Do not stop after producing another plan. Do not merge or
deploy, and do not rewrite the existing attributes branches as part of this task.

Read [implementation.md](./implementation.md), [architecture.md](./architecture.md),
[mvp.md](./mvp.md), [react.md](./react.md), [openapi.md](./openapi.md),
[testing.md](./testing.md), and [quality.md](./quality.md), plus repository instructions.
Inspect domain types before changing implementation. The user's desired direction
is functionality-owned domains, rather than placing everything associated with a
character inside `characters`.

Execute the [milestone plan](./domain-encapsulation-refactor-milestones.md), which
breaks this work into twelve focused updates with dependencies, ownership,
acceptance evidence, and integration gates. The broad stages below describe
design scope; the milestone plan controls assignment and delivery order.
Use native PR stacks for linear dependencies and keep each delivered update
green. If stronger enforcement exposes existing violations, resolve them
deliberately; do not hide them behind broad exemptions. Develop new rules with
fixtures before activating them repo-wide at the plan's final enforcement gate.

## Context And Evidence

The preceding review examined attributes PRs #94, #82, #83, #89, #93, and #96 in
`linuxlewis/dnd-character-manager`. Reviewed stack head:
`e104044c39982ea3167afa9ffa10f13f393fab4c`; comparison baseline:
`faf519271e2b06a825025ba433c38005340b116e`. Fetch current refs before starting;
these commits are evidence, not an instruction to use an outdated trunk.

- `lints/check-deps.ts` recognizes domain imports only through an
  `@domains/...` regex. A fixture with `types/value.ts` importing
  `../service/value.js` incorrectly reports no architectural violations.
- On the reviewed stack, `characters` grows from 5,242 to 8,524 handwritten
  TypeScript/TSX source lines, excluding tests. Folder moves alone will not
  reduce those totals.
- The stack's `docs/character-attributes-rolls-spec.md` explicitly requires
  keeping attributes inside `characters` and placing pure calculations in
  `types`. That is a design choice to supersede, not an accidental violation.
  This document may not exist on trunk; inspect it using the reviewed Git ref.
- `CharacterService.getCharacter` loads character detail including health and
  health history. In the attributes stack, its result is discarded before the
  attributes repository performs its own ownership check. Future consumers
  need a narrow access contract rather than this aggregate dependency.
- `CharacterSpellSlotsPanel` mixes slot operations, configuration, history,
  spell search, details, removal, and cache management. PR #96 adds content
  and dialog wrappers accepting 32 and 23 props respectively. Establish
  workflow ownership rather than copying these wrappers onto trunk.

The review ran lint, all 671 unit tests, and API generation checks at the stack
head. It did not run the full integration/browser suite. Those results are not
validation of the upcoming refactor.

R0 concrete decisions and pinned baseline evidence are recorded in
[the baseline inventory](./domain-encapsulation-refactor-baseline.md).

## Stage 1: Guidance And Enforceable Boundaries

1. Define domain ownership by cohesive business functionality and invariants.
   Explain when a new domain is justified and when a component or module suffices.
2. Document the intended ownership:

   | Area | Owns |
   | --- | --- |
   | `characters` | Identity, ownership, name, class, level, and experience |
   | `health` | HP state, health operations, and health history |
   | `spellcasting` | Saved spells/features, slots, defaults, and spell history |
   | `inventory` | Existing item, treasury, and inventory activity workflows |
   | `catalogue` | Existing catalogue data and external source boundaries |
   | App composition | Cross-domain queries/API contracts, page assembly, and cache coordination |
   | Future `attributes` | Ability scores, proficiencies, and derived rolls |

3. Resolve the tension between pure shared browser/server calculations and
   the documented layer responsibilities. Choose and document one client-safe
   location and permitted dependency direction. Avoid configuration wrappers
   added solely to satisfy layer ordering. Do not turn providers into a home
   for business logic.
4. Make enforcement resolve actual import targets, including relative paths,
   configured aliases, and `.js` specifiers targeting TypeScript source. Cover
   re-exports and statically resolvable dynamic imports. Prefer TypeScript's
   existing parser/resolver over a new collection of import regexes.
5. Test backward imports, cross-domain lower-layer imports, forbidden UI
   server dependencies, and server dependencies hidden through barrels.
   Include allowed imports and provider/generated-client exceptions so the
   linter does not prohibit valid composition. Document treatment of type-only
   imports and unresolvable specifiers; do not silently ignore domain targets.
6. Update architecture and implementation guidance together. Clarify public
   domain contracts, cross-domain service collaboration, application composition,
   and how new features select their domain. Keep rules and tests consistent.
7. Implement the domain-owned database schema and registration pattern below.
   Update the layer rules, domain-shape checks, and OpenAPI guidance to recognize
   public persistence schemas and application-owned combined API contracts.

## Database Models And Relationships

Keep Drizzle models in the domain that owns the data, similar to Django app
models. Register them together so application queries can use Drizzle's existing
relational query API (`db.query.characters.findFirst({ with: ... })`). Do not
build a custom relationship loader or require separate service calls for every
related read. Dedicated database views are not a prerequisite for composition.

Use this organization as the implementation baseline:

```text
src/domains/<domain>/schema/tables.ts      # Domain-owned physical mappings
src/domains/<domain>/schema/relations.ts   # Local/owning-side relationships
src/domains/<domain>/schema/index.ts       # Narrow public persistence exports
src/database/schema.ts                    # Registers public domain schemas
src/database/character-relations.ts       # Cross-domain reverse relationships
src/application/character-detail/         # Combined query, contract, and handler
src/providers/database/                   # Connection and transaction machinery
```

`schema/` is a server-only persistence definition layer, separate from Zod domain
and API types. It may import Drizzle, its own leaf types, and explicitly allowed
public schemas for foreign keys. It must not import repositories, services,
runtime modules, the initialized database client, or the aggregate registry.
Keep each physical table defined once; preserve existing names and migrations.

Health and spellcasting may reference the public character identity table to
declare their foreign keys. Define relationships internal to a domain locally.
Put reverse cross-domain relationships, such as character-to-health and
character-to-spell-slots, in database assembly so character identity does not
import each dependent feature. Keep schema-module dependencies acyclic. Register
each table's relation configuration once, combining local and cross-domain
declarations where necessary rather than exporting competing configurations.

Initialize Drizzle with the assembled schema and preserve the schema's inferred
database/transaction types. The current `drizzle(client)` initialization and
unparameterized `ReturnType<typeof drizzle>` do not provide the desired typed
relational API. Confirm syntax against the installed Drizzle version; no major
ORM upgrade is required for this feature. Foreign keys and Drizzle relation
metadata are distinct and both must remain correct.

Domain repositories own writes to their own tables. General cross-domain reads
belong in application queries using the registered relationships or explicit
Drizzle joins when filtering/sorting requires them. Permit narrowly documented
identity/ownership reads needed by transactional domain mutations; do not make
cross-domain writes legal just because table definitions are public.

Enforce schema dependency direction and public import boundaries, including
barrels. Also account for access through the typed database handle: importing
only `getDb` can still allow `db.query.otherDomainTable`. State which access rules
are mechanically enforced and which require narrow repository interfaces or
review; do not claim import checks alone enforce table ownership.

## Combined API Responses And Cache Ownership

Preserve `GET /api/characters/:id` and its current operation ID and JSON shape.
Move the combined character-detail query, response contract, and route assembly
to application composition while leaving health and spellcasting feature
contracts with their owning domains. A character URL does not require all its
response data to belong to the `characters` domain.

Application response schemas may compose the contributing domains' public Zod
schemas. Load only the required columns/relationships with Drizzle, apply domain
calculations, and validate/map the result to the explicit HTTP response. Do not
return raw ORM records or expose ownership/internal fields accidentally. Preserve
the generated client interface through contract registration and regeneration.
Document absence/nullability explicitly; a missing required related record must
not silently become a healthy default state.

Start with character identity plus health and recent health changes as the
concrete relational-query example. Keep independently loaded feature endpoints.
Do not add arbitrary `?include=` combinations or a new full-sheet endpoint during
this compatibility refactor. Add batched/relational character-list reads only
where the existing response needs them; avoid introducing N+1 queries.

Scope combined reads to the authenticated owner. Use a coherent database
snapshot when derived results depend on multiple reads; related loading is not
an authorization mechanism. Preserve transaction-bound ownership checks and
atomic multi-domain initialization through explicit application workflows.

Define application-level cache coordination for combined responses. Health
mutations must continue updating or invalidating character detail; any existing
list/summary query that includes health must also be reconciled. Keep feature
mutations reusable without requiring their domain to enumerate every consuming
screen. Use generated TanStack Query keys and mutation callbacks. Add focused
coverage proving an update cannot leave the combined response stale.

## Stage 2: Extract Health

Trace `createCharacterHealthService`, `createCharacterHealthRepository`,
`registerCharacterRoutes`, character creation, and `CharacterHealthPanel`.
Move health schemas, persistence mappings, services, route contracts/handlers,
UI, and their tests into `health` with explicit public boundaries.

Preserve HTTP paths, operation IDs, response payloads, database table identities,
and user-visible behavior. Regenerate API artifacts when registration moves.
Do not rename physical tables or edit deployed migrations simply to match folders.

Replace full-character loading used for authorization with a minimal access
contract. Establish how character creation initializes health atomically and how
mutations enforce current ownership within their transaction. Preserve lock
ordering and anonymous-user transfer behavior. Do not replace atomic creation
with a sequence of independent service calls or introduce a check-then-write
authorization race.

Move composition of character identity and health to an appropriate upper-layer
boundary using the combined API pattern above. Move physical mappings into the
owning domain's public `schema/` and register the character/health relationship.
Neither domain's repository should import the other domain's private
repository or duplicate its Drizzle table mapping to evade enforcement. If a
shared transaction collaborator is necessary, keep it explicit, narrow, and
documented; avoid a general event bus or framework for this extraction.

## Stage 3: Extract Spellcasting

Trace `createCharacterSpellSlotService`, `createCharacterSpellService`,
`registerCharacterSpellRoutes`, slot routes, and `CharacterSpellSlotsPanel`.
Move owned types/configuration, persistence, services, contracts, UI, and tests
into `spellcasting`. Keep catalogue integration through its existing public
service boundary and reuse the character-access pattern established for health.
Publish spellcasting's models through its `schema/` entrypoint and register the
character relationships without introducing a reverse domain dependency.

Give complete workflows ownership of their state and queries. In particular,
search, saved-spell details/removal, and slot configuration/actions should not
be coordinated through a giant display component's prop list. Keep the shared
character page focused on composition. Preserve generated query helpers and
cache reconciliation, and avoid introducing `useEffect` in application code.

Delete obsolete forwarding wrappers, duplicate aliases, and redundant internal
conversions where the extraction makes them unnecessary. Retain meaningful
behavioral coverage; remove tests only when their implementation-only wrapper
disappears or equivalent behavior is covered at its new owner.

## Attributes Stack Integration Notes

Produce a precise old-to-new module/public-contract map for the later attributes
refactor. Its existing-domain requirement must be replaced with the new guidance.
Record likely conflicts in character schemas/tables, route registration,
generated clients, character-detail composition, and health/spell tests. Specify
how future attributes models register their relationships, how combined reads
consume them, and how attribute/level mutations reconcile dependent query caches.

Do not import unmerged attributes functionality or unrelated fixes merely to
make this foundation stack compile. The review identified additional stack-head
issues: health-delta retries can apply twice after a lost response; toggling spell
editing clears failed-action reconciliation; attribute inputs silently clamp
out-of-range scores. Recheck whether each exists on current trunk. Preserve or
add relevant regression coverage when touched, but distinguish existing trunk
behavior from fixes required when the attributes stack is adapted.

## Acceptance And Delivery

- Linter fixtures demonstrate both rejected illegal imports and accepted legal
  imports across actual repository import styles. Application code passes the
  stronger enforcement without broad domain exclusions.
- Health and spellcasting own their functionality across layers. Character
  identity/access remains narrow. Domain repositories do not bypass public
  boundaries, and UI does not acquire server dependencies through barrels.
- Drizzle relational queries load domain-owned related records with inferred
  types. Integration coverage verifies relationship cardinality, missing-related
  behavior, ownership isolation, and bounded query counts on the composed read.
  Schema registration has no circular initialization or duplicate table mappings.
- Character-detail HTTP paths, operation IDs, payloads, and generated client
  usage remain compatible after application-level composition. Mutation/cache
  tests verify that existing combined views reflect successful feature changes.
- Existing API compatibility, authorization, atomic initialization, ownership
  transfer, health history, spell persistence, slot defaults/use/restore, and
  critical browser journeys remain covered and pass.
- Run `pnpm lint`, `pnpm api:check`, `pnpm test`, `pnpm build`,
  `pnpm check:docs`, and `git diff --check`. Report any actual environmental
  blockers and failed checks accurately; do not claim the earlier review's
  results as verification.
- Update quality tracking and focused architecture documentation. Report
  handwritten source and test line changes separately from generated artifacts,
  and distinguish moved code from eliminated code. Do not compress formatting
  to create artificial line savings.
- Deliver draft PRs with clear problem/behavior descriptions, validation, and
  the integration map for the attributes stack. Follow the gh-stack skill for
  native stack creation. Leave merging and deployment for a separate action.
