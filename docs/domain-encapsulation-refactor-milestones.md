# Domain Encapsulation Refactor Milestones

Prepared: 2026-09-07

Status: R0 accepted; R1 delivered for review; later milestones remain planned.

## Purpose And Authority

This is the execution plan for the
[refactor brief](./domain-encapsulation-refactor-brief.md). That brief defines
architecture and compatibility requirements; this plan defines delivery units.
An accepted milestone means its reviewed commit passes its gates. It does not
mean the PR has merged. Merging and deployment remain separate actions.

## Milestone Ledger

Use stable IDs in task titles, branches, PR descriptions, and handoffs. Replace
`planned` with `active`, `review`, `accepted`, or `blocked`, and fill in evidence
as work proceeds. Record a concrete dependency or failure for blocked work.

| ID | Deliverable | Depends on | Status | Owner / PR / verified SHA |
| --- | --- | --- | --- | --- |
| R0 | Baseline, ownership map, and architecture decisions | None | accepted | [PR #98](https://github.com/linuxlewis/dnd-character-manager/pull/98); coordinator verified `f26b24e93dc6b3c8aa1890a9a36ade7bb5a102d6`; CI green |
| R1 | Import resolution and dependency graph | R0 | review | R1 agent; [delivery evidence](./domain-import-graph.md); coordinator verification pending |
| R2 | Boundary rules, fixtures, and migration inventory | R1 | planned | Unassigned |
| R3 | Public schemas and typed Drizzle registration | R2 | planned | Unassigned |
| R4 | Character access and atomic creation workflow | R3 | planned | Unassigned |
| R5 | Health backend and composed character-detail API | R4 | planned | Unassigned |
| R6 | Health UI ownership and cache coordination | R5 | planned | Unassigned |
| R7 | Spellcasting backend and relationships | R6 | planned | Unassigned |
| R8 | Spellcasting UI ownership | R7 | planned | Unassigned |
| R9 | Spell workflow simplification | R8 | planned | Unassigned |
| R10 | Repository-wide enforcement and bridge removal | R9 | planned | Unassigned |
| R11 | Integrated acceptance and attributes handoff | R10 | planned | Unassigned |

## Orchestration And Review Rules

- Default to one milestone per focused PR. A milestone can use several commits;
  split an unexpectedly large milestone into suffixed IDs with their own gates
  before assigning it. Never split at a point that leaves an uncompilable tree.
- The ledger describes a conservative integration order. Independent research,
  fixture design, and test-case preparation may run in parallel. Implement
  dependent work only against an identified predecessor SHA. Do not dispatch
  health and spellcasting extractions concurrently against the same old layout.
- Assign one integration owner for `src/api-contracts.ts`, server registration,
  `src/database/schema.ts`, generated files, and character-page assembly. Other
  tasks propose changes to these files through their owning milestone. Avoid
  simultaneous edits or independent regeneration on a shared worktree.
- Each implementation task gets its milestone card, the brief, a base SHA,
  owned paths, permitted shared-file edits, and required checks. Use separate
  worktrees for independent tasks. The milestone owner must deliver the working
  change and evidence, not another unexecuted plan.
- The coordinator verifies the delivered SHA and gates before accepting it.
  After a rebase or integration conflict, rerun checks affected by the resolution.
  Results for an earlier SHA are not proof for changed code.
- Temporary compatibility exports may keep intermediate PRs functional only
  when they preserve legal dependency direction. Record each bridge, consumer,
  and removal milestone. Do not introduce backward imports to preserve a path.
- Preserve current CI checks throughout. The new checker may initially report
  migration findings without gating them; label that mode explicitly. R10 must
  activate enforcement and remove the temporary reporting-only configuration.
- For native stacks, follow the gh-stack skill. Once an independently valid
  lower portion is approved for merge, remaining work can be rebased onto trunk.
  This plan itself does not authorize merging.

## Validation Gates

| Gate | Required evidence |
| --- | --- |
| D: documentation | `git diff --check` and `pnpm check:docs`; decisions agree across linked docs |
| S: source/tooling | D plus `pnpm lint`, `pnpm test:unit`, and `pnpm build`; new checker fixtures run in normal validation |
| B: boundary/UI | S plus `pnpm api:check` and `pnpm test`; focused scenarios below are included in those suites |

Use the gate named on each card on that milestone's final commit. Run focused
tests during development, then the required suite before acceptance. A failing
or unavailable required check leaves the milestone unaccepted: attach the exact
command, failure, and any baseline reproduction instead of silently waiving it.
Documentation-only handoffs do not require rerunning unchanged application tests.

## Milestone Cards

### R0: Baseline And Decisions

**Owns:** architecture/implementation/OpenAPI guidance and the milestone ledger.
**Gate:** D; also capture current trunk validation as baseline evidence.

Deliver the dependency matrix including `schema/`, database assembly, application
queries/contracts, providers, and client-safe pure calculations. Inventory current
HTTP operations, payload schemas, query keys, table definitions, creation paths,
and existing cross-domain access. Identify physical ownership separately from API
response ownership. Record current trunk and reviewed attributes SHAs.

**Acceptance:**

- [ ] Every model being extracted has one named owner and a destination path.
- [ ] Required one-to-one versus optional relations and history limits are recorded.
- [ ] Character creation, anonymous ownership transfer, and mutation transaction
  guarantees have named verification scenarios based on current behavior.
- [ ] The public schema/access contracts and location of shared calculations are
  concrete decisions, not a list of unresolved alternatives.
- [ ] Baseline failures are recorded separately from refactor regressions.

### R1: Resolve Real Import Targets

**Owns:** import resolver, graph representation, and focused tooling fixtures.
**Gate:** S. **Excludes:** domain moves and new application behavior.

Extract reusable resolution from the existing checker without changing its
effective domain policy yet. Use the existing TypeScript dependency to resolve
relative paths, configured aliases, `.js` references to TypeScript, barrel
re-exports, and literal dynamic imports. Include actionable source locations.

**Acceptance:**

- [ ] Equivalent relative and alias imports resolve to the same target.
- [ ] Re-export chains and cycles terminate deterministically with useful traces.
- [ ] Unresolved local/domain imports are reported; external packages and
  nonliteral dynamic imports receive an explicit documented treatment.
- [ ] Fixtures exercise actual module resolution, not just mocked graph edges.
- [ ] Existing lint behavior remains functional while the new graph is introduced.

### R2: Rules And Migration Inventory

**Owns:** rule engine, fixtures, checker documentation, migration finding ledger.
**Gate:** S. **Excludes:** broad repository cleanup.

Implement the R0 matrix over R1's graph. Add report-only execution against the
real repository while retaining existing CI checks. Classify every actual new
finding by owner and resolution milestone; do not promise that extraction will
fix unrelated violations automatically.

**Acceptance:**

- [ ] Relative `types -> service` imports fail the rule fixture that previously passed.
- [ ] Illegal private cross-domain imports, schema-to-client imports, and UI
  server dependencies through barrels fail with a dependency trace.
- [ ] Public schema foreign keys, application joins, generated clients, and
  legitimate provider usage pass; type-only imports follow the chosen matrix.
- [ ] Schema cycles are detected and the limits of table-access enforcement
  through `getDb` are stated honestly.
- [ ] Every current violation has a specific remedy; additional prerequisites
  receive suffixed milestone cards if needed, rather than an open-ended R10 cleanup.

### R3: Public Schemas And ORM Registration

**Owns:** initial schema moves, database registry, provider database types/tests.
**Gate:** B. **Excludes:** changing repository behavior or renaming SQL tables.

Move existing character identity and still-character-owned feature table mappings
into public schema modules. This first move changes the persistence boundary;
R5 and R7 change feature ownership. Assemble tables once and initialize Drizzle
with schema-aware database and transaction types. Account for existing auth,
inventory, and catalogue schema dependencies identified in R2.

**Acceptance:**

- [ ] Existing repositories use the same physical tables with no schema migration
  generated solely by a TypeScript file move.
- [ ] A real related read proves the installed Drizzle API and inferred nested types.
- [ ] Each table and relation configuration is registered once; imports have no
  initialization cycle or dependency on an initialized client.
- [ ] Client/server builds pass; database shutdown and test isolation still work.
- [ ] Any compatibility exports are enumerated with removal targets.

### R4: Access And Atomic Creation

**Owns:** narrow character-access contract and application creation orchestration.
**Gate:** B. **Excludes:** feature UI extraction.

Remove the need to load character detail merely to establish access. Establish
the explicit transaction boundary for identity and initial feature records.
Use the same transaction connection for collaborating writes; creating several
independent transactions inside an outer workflow is not atomic composition.

**Acceptance:**

- [ ] Access checks do not read health/history or other unrelated feature state.
- [ ] A failure initializing health rolls back character creation without orphan rows.
- [ ] Non-owner operations fail without mutation; ownership transfer and concurrent
  access scenarios preserve the documented transaction/lock guarantees.
- [ ] Mutation authorization remains valid at write time, not only before a transaction.
- [ ] The contract is exercised by an existing path and is usable by R5/R7 without
  exposing unrestricted private repositories or inventing a general workflow engine.

### R5: Health Backend And Character-Detail Composition

**Owns:** health models/types/repo/service/runtime; application detail query/contract;
health relationship registration. **Gate:** B.

Move health backend ownership and the combined detail response together so no
character-domain leaf schema imports health to keep the old aggregate alive.
Retain existing operation IDs and response shapes for creation/detail/edit paths.
Use Drizzle relations for the composed identity/health read.

**Acceptance:**

- [ ] Health tables and rules have one owner; identity schemas do not import health.
- [ ] All existing operations returning character detail use the composed contract
  without circular imports or duplicate route registration.
- [ ] Owner/non-owner, missing-required-health, and recent-history ordering/limit
  cases match the documented baseline; calculated values are validated.
- [ ] The combined read has a measured bounded query count and exposes no extra
  ORM/internal fields. Reads needing consistency use a coherent snapshot.
- [ ] Create, health update/history, and generated-client compatibility tests pass.

### R6: Health UI And Cache Coordination

**Owns:** health UI/tests and application health-cache/page wiring. **Gate:** B.

Move health controls to their domain and keep character-page assembly in the
application. Introduce the smallest reusable application-level cache coordinator
needed for existing combined responses, using generated keys and callbacks.

**Acceptance:**

- [ ] Heal, damage, editing, history, loading, and failure flows retain behavior.
- [ ] Successful health updates refresh the existing character detail and any
  existing health-bearing summaries without refreshing unrelated feature queries.
- [ ] Cache tests cover the combined response and failed mutations; no synthetic
  endpoint is introduced merely to demonstrate invalidation.
- [ ] A mounted/browser journey proves displayed health changes after a mutation.
- [ ] Character UI contains composition, not health rules or copied implementations.

### R7: Spellcasting Backend And Relationships

**Owns:** spellcasting schema/types/config/repo/service/runtime and relation wiring.
**Gate:** B. **Excludes:** UI restructuring.

Move saved spells/features, slots, defaults, and history into spellcasting. Reuse
R4's access/transaction pattern and preserve catalogue service integration. Update
contracts and backend callers atomically; existing UI continues using generated APIs.

**Acceptance:**

- [ ] Character identity has no dependency on spellcasting schemas or rules.
- [ ] Related spell/slot reads have correct cardinality and character isolation.
- [ ] Save/remove/details/search and slot configure/default/use/restore/history
  preserve payloads, authorization, and existing concurrency behavior.
- [ ] Catalogue failure behavior and provenance remain owned by the existing boundary.
- [ ] No duplicate physical mappings, route registrations, or private cross-domain
  repository imports remain in the extracted backend.

### R8: Move Spellcasting UI

**Owns:** spellcasting UI/tests and application page integration. **Gate:** B.
**Excludes:** substantial workflow rewrites; keep relocation reviewable.

Move UI ownership and update consumers. Remove incidental imports from health
components, such as generic numeric draft types, by giving such values an
appropriate local or existing shared home. Do not add a domain dependency for a
trivial presentation type.

**Acceptance:**

- [ ] Existing spell/slot browser journeys still reach their controls and dialogs.
- [ ] The moved UI uses generated clients and imports no private backend modules.
- [ ] Character-page composition renders the public spellcasting entrypoint.
- [ ] The diff separates mechanical moves from necessary wiring changes so R9
  can be reviewed as a behavioral-preserving simplification.

### R9: Simplify Spell Workflows

**Owns:** spellcasting interaction state, focused components/hooks, relevant tests.
**Gate:** B. **Excludes:** visual redesign or new spell features.

Separate state/query ownership for slot configuration/actions, search, details,
and removal. Shared state remains only where workflows actually coordinate.
Remove forwarding-only wrappers rather than replacing many scalar props with
one equally broad object. Do not port PR #96's wrappers or recovery changes blindly.

**Acceptance:**

- [ ] Search/retry/save, details/retry, and remove/cancel/failure operate independently.
- [ ] Slot operations retain pending/error behavior and history reconciliation;
  editing or dialog changes cannot silently discard required recovery state.
- [ ] Mounted tests exercise meaningful transitions, not just forwarded props.
- [ ] Deleted wrappers, conversions, and duplicate state are listed with source/test
  line deltas. Explain any net increase; formatting compression is not a reduction.
- [ ] Main orchestration responsibilities and public props are demonstrably smaller.

### R10: Activate Enforcement And Remove Bridges

**Owns:** final checker/CI activation, remaining assigned findings, obsolete exports.
**Gate:** B. **Excludes:** unbounded opportunistic cleanup.

Resolve the R2 inventory and compatibility bridge ledger. If a finding needs a
new architectural decision or substantial feature rewrite, create a focused
prerequisite milestone instead of bypassing the rule or expanding this PR silently.

**Acceptance:**

- [ ] Normal `pnpm lint` fails on the known relative-import bypass and other
  illegal fixture cases; new enforcement is no longer report-only.
- [ ] The actual application passes without broad exemptions or ignored domains.
- [ ] Temporary backward-compatible paths are removed after updating their last
  consumers; remaining intentional public APIs are documented.
- [ ] Guidance, checker behavior, public exports, and actual module ownership agree.
- [ ] No domain reaches another domain's private repositories through a barrel;
  any non-mechanically-enforced database access restrictions have named review checks.

### R11: Integrated Acceptance And Attributes Handoff

**Owns:** final integrated verification, quality tracking, ledger, integration map.
**Gate:** B on the assembled implementation; D for subsequent documentation-only edits.

Run the complete acceptance suite against the final stack head and verify the
critical combined journeys: create a character, change health, view detail,
configure/use/restore slots, and save/view/remove a spell. Include owner isolation
and failure/rollback coverage from earlier milestones without duplicating tests.

**Acceptance:**

- [ ] Required commands pass at the recorded final SHA; each PR links its evidence.
- [ ] An old-to-new model/type/service/route/UI map identifies how the attributes
  stack must adopt public schemas, relations, access contracts, and cache policy.
- [ ] Likely attributes rebase conflicts and the three previously reported recovery/
  validation issues are classified by current trunk versus unmerged-stack behavior.
- [ ] Handwritten source/test deltas distinguish code moved from code eliminated;
  generated artifacts and docs are reported separately.
- [ ] Every milestone is accepted, all temporary bridges/findings are resolved,
  and draft PRs are ready for review. No merge or deployment is performed.

## Required Handoff Record

For each milestone, append or link a compact record containing: milestone ID,
owner, base SHA, delivered SHA and PR, owned/shared paths changed, checks with
results, acceptance checklist status, remaining bridges, and downstream impact.
Attach exact repro steps for failures. The next task receives this record along
with its card; it should not need the originating conversation to proceed.

## R0 Delivery Record

See [baseline and architecture decisions](./domain-encapsulation-refactor-baseline.md) for
model/API/cache inventories, baseline validation, acceptance coverage, and downstream owners.
R0 was accepted by the coordinator at `f26b24e93dc6b3c8aa1890a9a36ade7bb5a102d6`
in [PR #98](https://github.com/linuxlewis/dnd-character-manager/pull/98), with green CI.

## R1 Delivery Record

See [import graph behavior and evidence](./domain-import-graph.md). R1 is submitted
for review; acceptance remains the coordinator's responsibility.
