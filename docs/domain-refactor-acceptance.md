# Integrated Domain Refactor Acceptance (R11)

Current rebase status (2026-09-08): local validation and coordinator review are
recorded in [the main rebase acceptance note](./domain-refactor-main-rebase.md).
Earlier acceptance statuses, SHAs, CI runs, and line counts in this document are
historical pre-rebase evidence. They do not certify the newly rebased PR heads;
publication and per-layer CI remain coordinator gates.

Implementation verified: `2824232f0b9acd844868025bd747607175042dfd` (R10),
[PR #119](https://github.com/linuxlewis/dnd-character-manager/pull/119).
Historical baseline: `faf519271e2b06a825025ba433c38005340b116e`.
Review date: 2026-09-07. Integration/evidence owner: R11 agent `r4_access_prep`;
independent source/spec reviewer: `r1_finish`, verified by coordinator `root`;
earlier backend semantic reviewer: `r2_rules`.

The coordinator accepted R11 at `7be07d94f5efaa35fe107b74a299389455a41545`,
[PR #121](https://github.com/linuxlewis/dnd-character-manager/pull/121), after CI
`34178542117` passed at that exact SHA. All 15 stack layers have verified heads,
bases, native positions, green CI and commit-pinned evidence links on their PRs.
Every milestone is accepted; the [ledger](./domain-encapsulation-refactor-milestones.md)
records those verified deliveries. No merge, deployment or attributes adaptation
was performed.

This subsequent documentation-only closure records the verified acceptance above.
Gate D passed after these status edits; application/source/test state and the full
implementation Gate B at `2824232f0b9acd844868025bd747607175042dfd` remain unchanged.
The current PR head's CI is available on GitHub; the historical run above is evidence
for its named SHA, not a claim about a later commit.

## Exact Implementation Validation

The clean R11 worktree started at the implementation SHA above. Source, tests,
configuration and generated artifacts remained unchanged throughout validation.

| Required check | Result at that implementation |
| --- | --- |
| `pnpm lint` | Pass: Biome, existing repository checks, strict boundaries with zero findings |
| `pnpm build` | Pass: includes `pnpm api:check`, TypeScript, browser/PWA and server builds |
| `pnpm test` with `VITEST_MAX_WORKERS=4` | 202 unit files / 680 tests; 30 integration files / 98 tests; 31 Chromium journeys / 40.6 seconds; all pass |
| `pnpm lint:boundaries --json` | Exit 0; strict mode, empty findings array |
| `git diff --check` and `pnpm check:docs` | Pass after R11 documentation edits; these Gate D checks validate the documentation handoff |

The full command ran build before the test runner and used the reserved Compose
network subnet `10.253.241.0/28` for this worktree. No timeouts, retries or assertions
were weakened, and no failed run required a fix. The runner removed its owned
Postgres container, volume and network; the shared test lease was released.
Supplemental execution logs are `/tmp/domain-r11-{lint,build,test,docs,diff}.log`
and `/tmp/domain-r11-boundaries.json`; the committed counts, commands, SHA and
scenario links here are the durable evidence, not those temporary files alone.

Combined production journeys and regression coverage reused in this run:

| Acceptance boundary | Committed executable evidence |
| --- | --- |
| Create/detail and owner isolation | [creation browser flow](../tests/e2e/character-creation.spec.ts), [atomic creation integration](../src/application/character-detail/workflows/create-character.integration.test.ts), [composed query integration](../src/application/character-detail/query.integration.test.ts) |
| Health edits/history and cache failure/retry | [health browser flow](../tests/e2e/character-health-flow.spec.ts), [cache browser flow](../tests/e2e/character-health-cache.spec.ts), [health transaction integration](../src/domains/health/repo/character-health-repository.integration.test.ts) |
| Slot configure/use/restore and atomic history | [slot transaction integration](../src/domains/spellcasting/repo/slot-transactions.integration.test.ts), [defaults revalidation](../src/domains/spellcasting/service/defaults-revalidation.integration.test.ts), existing health-flow spell controls |
| Spell search/save/view/remove, failures and late response | [workflow browser cases](../tests/e2e/spell-workflow-recovery.spec.ts), [late mutation browser case](../tests/e2e/spell-late-mutation.spec.ts), [ownership transactions](../src/domains/spellcasting/repo/ownership-transactions.integration.test.ts) |
| Identity access and inventory write authorization | [access integration](../src/domains/characters/access/index.integration.test.ts), [inventory ownership integration](../src/domains/inventory/repo/character-inventory-ownership.integration.test.ts) |
| Identity edits preserve feature state | [level side-effect integration](../src/domains/characters/runtime/routes.level-side-effects.integration.test.ts) |

## Ownership Review And Enforcement Limits

The backend semantic review found no actionable foreign-private-data access or
returned persistence-capability regression. Actual SQL/table ownership was followed
through injected database getters, transaction parameters, catalogue's database
resolver and inventory history callbacks:

| Executing owner | Reads / writes and cross-domain collaboration |
| --- | --- |
| Characters | Identity table only; access lookup/lock returns parsed id/name/class/level, filtered by owner |
| Health | Health/state history only; identity lock through public access before mutable reads, normalization and atomic writes |
| Spellcasting | Saved spells/slots/slot history only; identity lock before writes/current-state calculation; remote catalogue/defaults fetch outside locks; class/level revalidation permits at most two fetch attempts |
| Inventory | Scope/items/treasury/history only; public identity service prechecks and transaction-bound access locks; current item/treasury state and history share the transaction |
| Catalogue | Catalogue item/audit/spell tables only; parsed public lookup results, remote fetch before persistence transaction |
| Application detail | Explicit owner-filtered registered relational read over identity/health/events, selected columns, parsed aggregate, newest five events; one measured SELECT |
| Application creation | Same transaction supplied to public identity/health initializers; no independent inner transactions; composed response read after commit |
| Providers | Registered Drizzle handle; auth adapter owns infrastructure auth tables |

Concrete query owners within those groups (paths under `src/`):

| Module(s) | Physical table ownership |
| --- | --- |
| `domains/characters/repo/character-repository.ts`, `characters/access/index.ts` | `characters` identity reads/writes; access is lookup/row lock only |
| `domains/health/repo/character-health-repository.ts` | `character_health`, `character_health_events` |
| `domains/spellcasting/repo/character-spell-repository.ts` | `character_spells` |
| `domains/spellcasting/repo/character-spell-slot-repository.ts` | `character_spell_slots`, `character_spell_slot_events` |
| `domains/inventory/repo/character-inventory-scope-repository.ts` | `inventory_scopes` lookup; delegates identity locking to public access |
| `domains/inventory/repo/character-item-repository.ts`, `inventory-item-repository.ts` | `inventory_scopes`, `inventory_items`; transactional wrapper delegates history append |
| `domains/inventory/repo/character-treasury-repository.ts`, `inventory-history-repository.ts` | `inventory_scopes`, `inventory_treasuries`, `inventory_history_entries`; history uses caller transaction |
| `domains/catalogue/repo/catalogue-item-repository.ts`, `catalogue-spell-repository.ts` | `catalogue_items`, `catalogue_item_seed_audits`, `catalogue_spells` |
| `application/character-detail/query.ts`, `workflows/create-character.ts` | Read projection over `characters`, `character_health`, `character_health_events`; creation delegates writes to public initializers |

Public service/access outputs were followed: no db/transaction/query/table handles,
private repository objects, or spread storage capabilities are returned. Accepting
an injected transaction or test repository input is not an output capability leak.
Production raw `execute`/`unsafe` calls were absent from domains/application;
SQL tags define owned timestamps/checks/order expressions. Feature schema imports
establish declared FK/relations, not foreign repository access.

The R7 review scope at `0198553fe11ca4a00aaa4816eaba6c6a931b4f0f` contains 165
TS/TSX paths: domain access/schema/types/config/repo/service/runtime, application
except UI/cache, database/providers, and api-contracts/app-server roots; `.test.*`
and `.spec.*` excluded. It includes one catalogue integration-fixtures module,
so this is an audit scope, not 165 production files. Reconstructing that set from
both Git trees and comparing every recorded SHA256 at R10 yields **zero added,
zero deleted and zero changed paths**. The complete R7-to-R10 `src/` changed-path
inventory was also inspected: all changes are the planned R8/R9 domain UI/tests
and application UI wiring; no new/unclassified backend or server root escaped the
165-path check.

The independent `r1_finish` review, verified by the coordinator, additionally compared all 345 non-UI domain,
application, database/provider and generated paths from accepted R8 to R10,
including tests and additions/deletions: all path/blob identities match. It
reinspected strict command/CI wiring, normal-command negative fixtures, 17-table
registry assertions, removed aliases and final R9 workflow/cache guards, finding
no actionable source/spec discrepancy. Both reviews distinguish import legality
from actual data ownership: the globally registered Drizzle handle can expose
foreign tables without an illegal import. SQL ownership and returned capabilities
still require semantic review for future changes.

Read-only spell/inventory authorization and data reads retain separate statements;
slot GET reads state/history separately. Mutation lock proofs do not promise
instantaneous revocation or one transaction snapshot for every GET. The composed
detail query does have a single-statement snapshot. Absolute health PUT is not a
new delta retry/deduplication protocol.

## Compatibility And Bridge Closure

All 15 migration path/blob identities, the lockfile, and published OpenAPI JSON
are unchanged from baseline. OpenAPI blob: `3c8961020bb86058910d85c01dddda1310faf534`.
Generated TypeScript changes express contract/type ownership while URLs, operation
IDs and envelopes remain compatible. Registry tests assert all 17 physical tables
once and at most one relation configuration per table. No DDL was needed for
TypeScript ownership moves.

Strict lint has zero findings. [R10 closure](./domain-strict-enforcement.md) maps
F1-F5 to R2a, F6 to R6, and F7-F8 to R3. Character schema/types/service/UI exports
contain identity functionality, without health/spell forwarding bridges. Legacy
character-repo/character-row/repository-table aliases remain absent. Public schema
indexes, `characters/access` and initialization services are intentional contracts,
not temporary bridges. No temporary compatibility paths remain.

## Source Accounting

The exact baseline-to-R10 inventory shows **application source +273 lines**, not an
overall reduction. Additional explicit boundaries and transaction guarantees cost
code; R9's narrower workflow cleanup removes 37 application lines. Tests and
linter implementation are reported independently.

| Category | Baseline files / lines | R10 files / lines | Rename-aware added / deleted | Net lines |
| --- | --- | --- | --- | --- |
| Handwritten application | 196 / 19,585 | 241 / 19,858 | +3,173 / -2,900 | +273 |
| Tooling implementation | 21 / 1,922 | 31 / 2,790 | +874 / -6 | +868 |
| Tests and test support | 213 / 22,269 | 257 / 25,049 | +4,672 / -1,892 | +2,780 |
| Generated artifacts | 14 / 12,318 | 14 / 12,328 | +53 / -43 | +10 |
| Documentation | 23 / 4,153 | 39 / 6,647 | +2,596 / -102 | +2,494 |
| Configuration and operations | 19 / 667 | 19 / 671 | +7 / -3 | +4 |
| SQL migrations | 15 / 378 | 15 / 378 | +0 / -0 | +0 |
| Lockfile | 1 / 6,197 | 1 / 6,197 | +0 / -0 | +0 |
| Static assets | 8 / 94 | 8 / 94 | +0 / -0 | +0 |

These are physical text lines including blanks/comments and a final unterminated
line, using exact Git blobs. Six binary assets count as files but have no line
count. Reproduce the inventory with `git ls-tree -r --name-only SHA` and
`git show SHA:path`; compare with `git diff --numstat --find-renames BASE FINAL`.
Classify before totaling, in this precedence order:

1. `docs/**` and Markdown are documentation.
2. `tests/**`, `.test.*`/`.spec.*`, integration-fixtures/integration-helpers,
   `lints/boundary-fixture.ts`, and scripts prefixed catalogue-test-fixture or
   catalogue-journey are tests/support. This includes the handwritten generated-
   client contract test and historical inventory integration helper.
3. Remaining `src/generated/**` is generated; `src/app/public/**` is static assets.
4. Remaining lints/scripts are tooling; `.config.ts` and root build/test files
   are configuration. Remaining `src/**` is application, including CSS/HTML/types.
5. Migrations, lockfile and remaining configuration/operations are separate.

Every category's inventory delta equals its rename-aware insertion/deletion net.
R11's additional documentation is outside this implementation snapshot and visible
in its documentation-only diff; no source/test savings are attributed to it.

Git recognizes 64 rename pairs: 27 application and 37 tests/support. Of those,
31 are exact moves retaining **724 application lines and 1,398 test lines**. This
is a relocation lower bound; import-edited moves and splits of mixed modules also
retain code. Git's old-character-table to new-spellcasting-table match does not
assign all old symbols to spellcasting. The [module map](./domain-refactor-module-map.md)
records actual ownership.

R6 relocated 12 UI/test files containing 912 baseline lines. R8 relocated 20 files
with 866 application and 727 test lines, net zero, before R9 changed workflows.
R9's application +226/-263 = -37 and tests +300 are separate from these moves.
The parent panel shrinks 295 -> 250; modal props shrink 17 -> 9 excluding portal
options. Removed wrappers contained 68 lines, but retained inline markup means
those are not 68 eliminated lines. R5's health repository shrinks 142 -> 95 by
removing pre-read/precomputed-save/history APIs while its whole application change
grows 84. Do not sum relocation inventories or deletion columns as savings.

## Early Checklist Reconciliation And Handoff

The 25 unchecked R0/R1/R2/R2t/R2a boxes were documentation lag, not unmet source
criteria. The following committed records support checking them; historical gate
execution remains distinct from the exact final run recorded here:

| Milestone | Evidence for its five criteria |
| --- | --- |
| R0 | [Baseline](./domain-encapsulation-refactor-baseline.md): model/SQL owner map, required/optional relations and limits, creation/transfer/transaction scenarios, public contracts, passing baseline separated from structural risks |
| R1 | [Graph](./domain-import-graph.md) and [resolver fixtures](../lints/import-graph.test.ts): alias/relative resolution, barrels/cycles, unresolved/local/external treatment, real temporary projects, preserved original lint |
| R2 | [Policy](./domain-boundary-policy.md), [policy fixtures](../lints/boundary-policy.test.ts), [browser fixtures](../lints/boundary-browser.test.ts): illegal/valid edges, traces, cycles, honest SQL limits, assigned F1-F8 inventory |
| R2t | [Lifecycle](./catalogue-browser-fixture-lifecycle.md), [setup tests](../scripts/catalogue-journey-setup.test.ts), [metadata tests](../scripts/catalogue-journey-metadata.test.ts): single setup owner, partial-failure cleanup, reserved connection release, metadata validation, passing browser evidence distinguished from observed contention |
| R2a | [Calculations](./domain-calculation-refactor.md), owning config/type tests and [contract registration tests](../src/api-contracts.test.ts): XP/currency compatibility, acyclic value/config ownership, F1-F5 resolution, lazy API registration, honest move accounting |

R2a's full historical Gate B ran at implementation
`2b29a8ece419ea6d0c28edcab0f630e982e9a688`; its accepted documentation handoff was
`a345d79ab0786d0fd1357a2309480a339ea88a6d` with Gate D. Earlier environment,
fixture and timeout failures remain recorded in milestone evidence; this final
passing run does not erase them or imply each prose-only commit reran every suite.

The [module map](./domain-refactor-module-map.md) gives old-to-new model/type/
service/route/UI contracts. The [attributes handoff](./domain-attributes-adaptation.md)
classifies all three historical recovery/validation issues and supplies focused
future work units/regressions. That later owner must validate its own adaptation;
this refactor does not implement attributes or assert their merge readiness.
