# R2a: Calculation Ownership And Contract Registration

Base: locally accepted R2t `a28b6a9a0f2ad6d74424facacbd39771f1c65bea`,
[PR #107](https://github.com/linuxlewis/dnd-character-manager/pull/107), CI was pending
at the original handoff and subsequently passed (`34154029019`). R2a's complete B gate passes at
`2b29a8ece419ea6d0c28edcab0f630e982e9a688`; the subsequent commit only records this
evidence and passes D. Owner: R2a implementation agent. Accepted handoff
`a345d79ab0786d0fd1357a2309480a339ea88a6d`, [PR #108](https://github.com/linuxlewis/dnd-character-manager/pull/108),
CI `34154355621` passed. No merge or deployment is part
of this delivery.

## Ownership Changes

| Previous owner | New owner | Content |
| --- | --- | --- |
| `characters/types/character-experience.ts` | `characters/config/character-experience.ts` | XP thresholds and progress calculation |
| `inventory/types/currency.ts` | `inventory/config/currency.ts` | Four currency value/conversion functions |
| `inventory/types/currency-planning.ts` | `inventory/config/currency-planning.ts` | Add/spend planning, overflow error, private planning helpers |
| `inventory/types/currency-planning.ts` | `inventory/types/currency.ts` | Three planning value types, using `CurrencyTotalValue` directly |
| Private runtime contract imports in `api-contracts.ts` | Existing domain `runtime/index.ts` exports | Same contract arrays in the same order |

Configuration indexes publish the calculation entrypoints. Types barrels no
longer forward implementation functions. Existing repo/service/UI consumers
import their owning config. Service error translation and conversion planning
remain in the service layer; UI still receives the same pure planning outcomes.
No compatibility aliases remain and no feature is extracted in this prerequisite.

`DND_CURRENCY_TO_COPPER` stays defined once in currency types because currency
schemas use it to validate total value and conversion precision. History
refinements validate weighted balance changes directly using that same table.
Balance and conversion request reparsing remains at the original refinement
points, including existing thrown errors from `safeParse` for continuable bound
violations. This change does not silently alter invalid-input behavior.

Calculation tests move with their implementations. XP value-schema tests remain
beside types; planning interfaces join the existing currency value contract instead
of leaving a type-only module requiring a meaningless runtime test. New cases
exercise XP limits/clamping, target conversion overflow, malformed history
balances, and public contract loading without database configuration or SQL
initialization. Existing operation ordering assertions remain intact.

## Acceptance Evidence

- Real boundary report contains exactly F6-F8: cross-feature character page
  composition (R6), integration helper placement/public schema imports (R3).
  F1-F5 are resolved without rule exemptions. Report artifact:
  `/tmp/domain-r2a-findings.json`.
- Baseline/final history comparison:
  `pnpm exec tsx /tmp/domain-r2a-compare-history.mts`, run from the R2a worktree.
  The script imports accepted R2 `091934709c212fd7626c70a091e9063b7d4ecbf0`
  and the R2a implementation and compares complete
  result/issue payloads and throw-versus-failure behavior for 20 cases: valid data,
  nonintegral/same-denomination/overflow conversions, and negative/fractional/
  overflowing balances on each side for spend and convert. Result:
  `/tmp/domain-r2a-history-compatibility.log` (all cases match).
- `env -u DATABASE_URL pnpm api:check` passes with unchanged generated artifacts.
  The API registration unit test resets the module cache before loading public
  runtime exports and fails if the Postgres constructor is called.

| Check | Evidence |
| --- | --- |
| `pnpm lint` | Passed; `/tmp/domain-r2a-lint.log` |
| `VITEST_MAX_WORKERS=4 pnpm test:unit` | 180 files / 654 tests passed; `/tmp/domain-r2a-unit.log` |
| Focused fresh API registration test | 2 tests passed; `/tmp/domain-r2a-api-contract-unit.log` |
| `pnpm build` | Passed API freshness, TypeScript, browser/PWA, server; `/tmp/domain-r2a-build.log` |
| `env -u DATABASE_URL pnpm api:check` | Passed; `/tmp/domain-r2a-api-check.log` |
| Full `pnpm test` with local environment below | Passed: 654 units, 68 integration tests, all 25 browser tests (42.1 seconds); `/tmp/domain-r2a-full-test.log` |
| `pnpm check:docs` / `git diff --check` | Passed; `/tmp/domain-r2a-docs.log` and `/tmp/domain-r2a-diff.log` |

The first attempt (`/tmp/domain-r2a-full-test-initial.log`) exhausted Docker's
default network address pools. The coordinator verified an unused subnet and
authorized a temporary Compose file containing only default-network IPAM:
`10.253.241.0/28`. The full command is:

```bash
VITEST_MAX_WORKERS=4 COMPOSE_FILE=/home/sbolgert/.codex/worktrees/domain-r2a/docker-compose.yml:/tmp/domain-r2a-compose-network.yml pnpm test
```

This override affects only the worktree's owned test network. Normal cleanup
removes it; no repository or daemon configuration changes are needed. The first
network-enabled run passed units/integration but hit five browser timeouts under
host load (20 passed), preserved in `/tmp/domain-r2a-full-test-browser-timeouts.log`
and `/tmp/domain-r2a-timeout-artifacts.tar.gz`. API logs had no 5xx/errors or requests
over one second. Traces showed successful ordinary browser actions taking several
seconds, consuming the existing test budgets. The final B gates ran sequentially.
`VITEST_MAX_WORKERS=4` is a local environment setting supported by the installed
Vitest to avoid host oversubscription; all suites run and no worker setting is
committed. Playwright worker settings, assertions, timeouts and retries are unchanged.

A rerun exposed a five-second unit timeout after changing the existing contract
aggregation test to a dynamic import. Restoring its original static import keeps
transformation outside the assertion budget. The separate lazy-load test still
resets the module cache and proves fresh evaluation without SQL initialization.
The timeout log is `/tmp/domain-r2a-full-test-unit-import-timeout.log`. No test
timeouts or retry policies were increased.

The last pre-R2t sequential attempt is preserved in
`/tmp/domain-r2a-full-test-catalogue-timeout.log` and
`/tmp/domain-r2a-catalogue-timeout-artifacts.tar.gz`. The only failure is the
inventory-activity catalogue fixture's setup/cleanup timeout. Both inventory
specs reserve the same advisory lock throughout their browser journeys; the
waiting setup hook has a 30-second budget. Accepted R2 was independently rerun
and passed all 25 browsers in 45 seconds, so this is a timing hazard exposed by
these runs, not a claimed baseline test failure. Accepted R2t gives the shared
fixture one suite-level lifecycle while retaining real catalogue assertions.
R2a was rebased onto it without source conflicts and passes every B gate. The
final run removed its owned container, volume, and network after success.

## Size And Quality Review

Handwritten application TypeScript under `src/`: 19,737 -> 19,768 lines (+31). Tests:
18,179 -> 18,303 (+124). Generated TypeScript remains 1,400 lines, unchanged;
OpenAPI JSON and SQL migrations are unchanged. Documentation is counted separately.
The growth comes from explicit import boundaries, preserved refinement parsing,
and boundary tests. This is an ownership move, not a claimed line-count reduction.
The obsolete planning-types module is removed; its interfaces remain in currency
types. Calculation and planning bodies are relocated rather than duplicated.

`ripwire . --quality-delta` exits 2 with a short-horizon self-churn observation on the
edited history validator and a minor nine-line increase required to preserve its
parsing semantics. These are reviewed trade-offs, not suppressed with a blanket
acknowledgment. Its three new-symbol dead-code observations are moved TypeScript
interfaces and the used overflow error constructor. Log:
`/tmp/domain-r2a-quality.log`. No extra abstraction is introduced to lower a metric.
