# Catalogue Browser Fixture Lifecycle (R2t)

R2a validation passed 643 unit and 68 integration tests, then timed out in inventory
activity's `beforeAll` and `afterAll`. Two browser specs each prepared the same
catalogue fixture and reserved a max-one SQL connection holding
`pg_advisory_lock(20260829, 7)` for the full spec. The second setup could wait beyond
the 30-second hook deadline while the first completed its inventory journeys.
A cancelled setup also complicated cleanup while acquisition was still pending.

Evidence: `/tmp/domain-r2a-full-test-catalogue-timeout.log`, the earlier
`/tmp/domain-r2a-full-test-browser-timeouts.log`, and the preserved
`/tmp/domain-r2a-catalogue-timeout-artifacts.tar.gz`. The activity trace records
beforeAll finishing at approximately 31.4 seconds and afterAll at 61.4 seconds,
both with 30-second hook timeout errors. The earlier run also had unrelated browser
expectation timeouts; this change addresses only the shared fixture lifetime.

The independent R2 baseline rerun passed all 25 browser tests in approximately
45 seconds. This is evidence of a timing hazard in unchanged fixture code, not
proof of a reproduced baseline failure or a calculation-refactor regression.

## Change And Guarantees

`playwright.config.ts` runs `scripts/catalogue-journey-setup.ts` once after the
existing test runner supplies DATABASE_URL. Setup reuses the existing catalogue
prepare/cleanup functions, preserving synthetic/seeded selection, reserved lock,
owned-row deletion, and audit restoration guards. The existing cleanup stack
ensures cleanup precedes SQL client closure and runs once, even on repeated calls.

Setup validates the metadata before publishing JSON in CATALOGUE_JOURNEY_FIXTURE.
Both inventory specs parse those values; they no longer create worker-owned SQL
pools or acquire/release the shared catalogue lock. They still exercise the actual
catalogue API and UI with separate character data. No test timeout, worker count,
retry setting, browser assertion, application code, or catalogue model changed.

The returned Playwright teardown owns resources through all workers and test
retries. A preparation or metadata-validation failure invokes the same cleanup.
Cleanup failure still closes the database client; combined setup/cleanup failures
retain both errors. Abrupt process termination cannot be guaranteed to restore
rows, but the owned stack's existing outer cleanup remains in place.

## Validation

Eleven focused unit tests cover metadata boundaries, successful resource lifetime,
partial setup failure, cleanup failure, combined failures, and idempotent teardown.
They run through normal Vitest scripts discovery; none are accidentally collected
as browser tests. Full Gate B results and final SHA are supplied to the coordinator.
Logs: `/tmp/domain-r2t-{focused,lint,unit,api-check,test,build,docs,diff,quality}.log`.

Local stack validation uses the worktree's normal Compose file plus an external
network-only override at `/tmp/domain-r2a-compose-network.yml` to avoid exhausted
Docker default address pools. That override is uncommitted, does not alter the
application, and reserves only the coordinator-assigned `10.253.241.0/28` subnet.
No unrelated network is pruned or changed.

## R2t Gate B Results

All checks ran sequentially. Final results:

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm test:unit` | Passed: 178 files / 634 tests |
| `pnpm api:check` | Passed |
| `pnpm test` | Passed: 634 unit, 68 integration, 25 Chromium browser tests; browser 43.5 seconds |
| `pnpm build` | Passed API freshness, TypeScript, browser/PWA and server bundles |
| `pnpm check:docs` / `git diff --check` | Passed |
| `ripwire . --quality-delta` | Exit 0; zero regressions or new-symbol observations |

During the browser run, a separate read-only connection to this worktree's owned
Postgres observed exactly one granted fixture lock. The connection used
`getOwnedDatabaseUrl(readMetadata())` from the existing stack helper; credentials
were not logged. Exact query:

```sql
SELECT count(*)::int AS owners
FROM pg_locks
WHERE locktype = 'advisory'
  AND classid = 20260829
  AND objid = 7
  AND granted;
```

Result: `{"fixtureAdvisoryLock":{"owners":1}}`, recorded in
`/tmp/domain-r2t-lock-observation.log`. Both inventory specs completed in the same
parallel browser run. Normal outer cleanup removed the owned stack and assigned
network; no unrelated Docker resources were changed.

An earlier full-run attempt stopped in its repeated unit phase on an unchanged
generated-client contract test's 5-second timeout (633/634 passed). Preserve
`/tmp/domain-r2t-test-unit-timeout.log`; the unchanged test passed focused 8/8 in
`/tmp/domain-r2t-unit-timeout-focused.log`, and the subsequent complete run passed.
No test/source/timeout settings changed between those attempts. Under host load,
Vitest supports local `VITEST_MAX_WORKERS=4` if a later agent needs to bound worker
saturation; this successful run did not use that override. Playwright concurrency
was unchanged throughout.
