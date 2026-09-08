# Strict Domain Enforcement (R10)

Base: accepted R9 `cc6387549d8bd82295761f7eeb3f6050ddc8ae5a`,
[PR #118](https://github.com/linuxlewis/dnd-character-manager/pull/118).

## Normal Validation

`pnpm lint` now runs Biome, `lints/check-deps.ts`, and
`lints/check-boundaries.ts --strict` in sequence. The existing CI lint step inherits
the strict gate. No rule implementation, exemption, dependency, application source,
API artifact, or migration changes in R10. Existing co-located-test, file-size,
domain-shape, logging, and React conventions remain enabled.

`lint:boundaries` is the standalone strict gate. `lint:boundaries:report` remains
useful as an explicitly labeled diagnostic, never acceptance evidence by itself.
The CLI defaults to strict, supports structured JSON, and rejects conflicting or
unknown flags. Read/configuration errors fail even in report mode.

`lints/check-boundaries.test.ts` exercises the actual CLI in temporary projects.
It verifies default/strict success and failure, report labels/zero exit, JSON
findings, missing-target failure, and invalid flags. The normal-command fixture
reads the real package lint script and uses local installed dependencies without
network access. Its clean project passes normal lint. Both a relative
`types -> service` import and a foreign private service import pass Biome and the
legacy checker independently, then fail normal lint with a strict boundary trace
at the offending source line. This guards command wiring as well as policy behavior.

## Findings And Bridge Closure

The original R2 ledger remains historical evidence. Current closure is:

| Findings / boundary | Resolution and evidence |
| --- | --- |
| F1-F5 private runtime contract imports | R2a public runtime registration; [delivery](./domain-calculation-refactor.md) |
| F6 character UI importing inventory UI | R6 application-owned page composition; [delivery](./domain-health-ui.md) |
| F7-F8 production-looking integration helper and private table import | R3 test-support relocation and public schemas; [delivery](./domain-schema-registration.md) |
| Schema aliases and table reexports | R3 removed old repository aliases; registry imports public schemas once |
| Health backend and UI paths | R5/R6 moved ownership without character compatibility exports; [backend](./domain-health-composition.md) and [UI](./domain-health-ui.md) |
| Spellcasting backend and UI paths | R7/R8 moved ownership without character compatibility exports; [backend](./domain-spellcasting-backend.md) and [UI](./domain-spellcasting-ui.md) |

No temporary compatibility bridge remains to delete in R10. Character public
exports contain identity functionality; its schema exports only `charactersTable`.
Existing feature names prefixed `Character` inside health/spellcasting identify
their subject and are not old-path aliases. Narrow `characters/access/index.ts`
is an intentional identity/lock API. Public `schema/index.ts` definitions and
service initializers are the supported collaboration contracts. A domain's
`repo/index.ts` is not permission for foreign repositories to import it.

## Required Manual Review

Import enforcement does not prove SQL ownership. The milestone coordinator owns
the final R11 review, with a recorded reviewer and final SHA. It must:

1. Enumerate actual read/write tables in domain repositories, following aliased
   connections, `db.query`, helper calls, and raw SQL. Writes belong to the owner;
   foreign identity checks use the narrow public access contract.
2. Verify application query helpers remain read-only and owner-scoped. Check
   required-related-row handling, bounded history, and executed query counts.
3. Follow initialization/mutation transaction handles, identity locks, and state
   reads; retain rollback and two-client ownership-transfer proofs. Remote defaults
   fetch outside locks and revalidate relevant context after acquiring the lock.
4. Inspect returned service/access values for leaked repositories, schema/query
   handles, or other lower-layer capabilities that import forwarding cannot detect.

R11 must recheck changed, deleted, and newly added backend paths against its prior
audit; a zero-finding import report does not replace this review. No broader SQL
analysis or generic repository framework is introduced for R10.

## Validation And Handoff

Full Gate B passed on the R10 implementation based on the accepted R9 SHA above:

| Check | Result |
| --- | --- |
| `pnpm lint` | Biome and legacy checks pass; strict boundary gate has zero findings |
| `pnpm test:unit` | 202 files / 680 tests, including eight new CLI/normal-command cases |
| `pnpm build` | API freshness (`pnpm api:check`), TypeScript, browser/PWA, and server bundles pass |
| `pnpm test` | 680 unit tests, 98 integration tests in 30 files, 31 Chromium journeys in 44.3 seconds |
| `pnpm check:docs` / `git diff --check` | Pass after the final evidence update |
| `ripwire . --quality-delta` | Exit 0; zero regressions, new-symbol findings, or gating observations, including rerun after staging the new test |

Ripwire also discovers the three named helpers in the new test when mapped directly;
its zero findings do not mean that the test contains no symbols. Manual review
confirms the fixture copies the actual script, uses bounded subprocess waits,
cleans temporary files, and verifies the negative cases fail at the intended gate.
No source/checker policy changed after successful tests; final edits record evidence.

Logs: `/tmp/domain-r10-{focused,lint,unit,build,test,docs,diff}.log`,
`/tmp/domain-r10-quality-staged.log`, `/tmp/domain-r10-test-map.log`, and
`/tmp/domain-r10-boundaries.json`. Full validation used `VITEST_MAX_WORKERS=4`
and the reserved `/tmp/domain-r2a-compose-network.yml` override for this worktree's
Compose stack. Build preceded the full run. The runner removed its owned database,
volume, and network; retained browser artifacts are under `test-results/` and
`.stack/`. No failed validation run or application fix was needed in R10.

The diff adds 125 test lines and changes one package script line. Handwritten
application source, generated clients, dependencies, and migrations have zero delta;
this activation does not claim source elimination. Documentation is additional.
R11 owns the final integrated audit and attributes handoff. The coordinator records
the delivered commit/PR after review; this milestone does not accept itself or merge.
Rollback is a code revert; no data migration is needed.
