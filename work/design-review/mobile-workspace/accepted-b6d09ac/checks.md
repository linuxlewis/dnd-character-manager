# Integrated Validation Results

Candidate: `b6d09ac6ef5099da5c6c02e0c28e3fdb0e3e07ad` (clean).
Application source: `333f8430e90e1b8b3792b1cb177475ae028a752f`.
Base main: `faf519271e2b06a825025ba433c38005340b116e`.

- `pnpm test`: PASS; 599 unit, 68 integration, 40 browser tests.
- `pnpm lint`: PASS.
- `pnpm api:check`: PASS.
- `pnpm build`: PASS (includes API generation check and TypeScript).
- `pnpm check:docs`: PASS.
- `git diff --check`: PASS.
- Independent root review: all 62 viewport captures in six contact sheets inspected; selected full-resolution editor/card/error captures and live focus-return workflows inspected.
- Native iOS/Android keyboard, safe-area, rotation and installed PWA: NOT RUN.

Screenshots use actual capture time, en-US and UTC. Server-created fixture timestamps remain actual data. No pixel-regression baselines are approved by this package; deterministic clock/data setup is required before establishing those baselines. Geometry assertions and independent visual review are the acceptance gates here.

GitHub CI status and final documentation-only commit are recorded in the PR stack; this file describes the tested source commit, not subsequent external checks.
