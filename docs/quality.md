# Quality Tracking

Track the health of each domain and architectural layer. Update this when you improve or identify gaps.

## Grading Scale

- **A** — Well-tested, documented, clean architecture
- **B** — Functional, some test gaps or missing docs
- **C** — Works but needs attention (tech debt, poor coverage)
- **D** — Fragile, missing tests, known issues
- **F** — Broken or placeholder only

## Domain Grades

| Domain | Types | Config | Repo | Service | Runtime | UI | Overall | Notes |
|--------|-------|--------|------|---------|---------|----|---------|----|
| catalogue | A | A | A | A | A | N/A | A | C1 provenance/source encapsulation plus C2 typed Foundry equipment ingestion, deterministic item precedence, persisted seed audits, readiness behavior, local search/detail APIs, generated clients, and boundary/integration coverage |
| inventory | A | N/A | A | A | A | A | A | A1 inventory types provide boundary-safe Zod schemas, currency conversion helpers, ownership/item invariants, and focused unit tests; A2 adds character scope/treasury mappings, parsed row mappers, race-safe transactional persistence, and focused unit/integration coverage; A3 adds injected treasury service rules, legacy-compatible greedy spend normalization, atomic mutations, character authorization collaboration, six typed treasury operations, generated OpenAPI/client artifacts, and focused unit/route/integration coverage; A4 adds reusable personal treasury presentation, shared client/server currency planning, live four-denomination add/spend previews, one-step submission, cache updates, failure-state isolation, co-located UI tests, and the M1 browser journey; A5 adds shared scope-keyed item/history migrations, Zod-safe row mappers, CRUD/filter/paging repositories, literal case-insensitive category regression coverage, catalogue snapshot retention, parallel-safe integration cleanup, and cascade/isolation integration coverage; A6 adds character-scoped item CRUD/equip services, ownership and scope isolation, catalogue snapshot mapping, explicit failure/status mapping, mutation history, generated contracts/clients, and focused unit/route/contract coverage; A7 adds independently loaded personal inventory UI, local mundane/magic catalogue search and autofill, snapshot provenance fallback, responsive cards/drawer/forms, mutation reconciliation, focused co-located UI coverage, and the M2 browser journey with deterministic catalogue seeding; H1 adds versioned action-specific history details, A6 compatibility normalization, nullable actor persistence, filtered deterministic repository reads, and focused mapper/repository coverage; H2 adds trimmed optional treasury notes, authoritative actor/request details, and transactionally coupled currency history writes with rollback, no-op, rejection, conflict, and making-change coverage; H3 adds the authorized character history API with filter/pagination validation, scope-safe empty pages, public response-boundary checks, generated OpenAPI/client artifacts, and focused service/route/integration coverage; H4 adds the personal activity preview/drawer field-ledger UI, action/entity filters, local date grouping, explicit pagination/retry states, pure item/treasury formatters, mutation invalidation, malformed-entry fallback, and focused formatter/cache UI tests plus mounted interaction/regression coverage |
| characters | B | B | B | B | B | B | B | Character create/list/detail, combined detail-page character editing for name, level, and experience points, experience progress to next level, health tracking, spell slot tracking, mobile-safe editable input sizing, add/remove-spell flows, cantrip and feature spell-list entries, saved spell details, and local-catalogue spell search/save/details have unit, integration, route, generated-client, and e2e coverage; the health-flow e2e uses the catalogue-owned deterministic loopback fixture on fresh owned stacks and fails safe when a worktree stack is already running |

## Cross-Cutting

| Provider | Grade | Notes |
| ---------- | ------- | ------- |
| auth | B | Better Auth anonymous sessions, magic-link sign-in/sign-out, anonymous character transfer, Resend delivery wiring, Postgres-backed tables, and current-state documentation are wired; the Resend sender domain must be verified before emails reach user inboxes |
| database | B | Postgres provider wired through Docker Compose stack |
| telemetry | B | Pino logger, request IDs, route timings, and stack log files are wired; metrics/traces are future work |
| openapi | B | Route contracts generate `openapi.generated.json` and a typed frontend client; broader coverage should grow as domains are added |
| pwa | B | Vite production builds emit a web manifest, service worker, installability icons, static asset MIME handling, and cache-header coverage for PWA update entry points; offline API data is intentionally out of scope |
| production | B | Node 24 multi-stage Docker image and production Compose stack are documented; local production deploy verifies public PWA cache headers; deployment hardening remains environment-specific |
| feature-flags | D | Placeholder |

## Mobile Workspace Validation

The main-based mobile refactor preserves the shipping Spells and Inventory functionality; the
deferred Attributes & Rolls feature is not included. Coverage now includes compact identity/XP/HP,
responsive section navigation, retained section state and query isolation, compact inventory and
spell presentation, on-demand history, persistent editor actions, failed-draft retention, focus
trapping/return, enlarged text, numerical extremes, and section-local recovery. Existing mutation,
reconciliation, catalogue, and history-pagination journeys continue to run.

At clean candidate `b6d09ac` (application source `333f843`), the complete `pnpm test` gate passed
599 unit, 68 integration, and 40 browser tests. Static validation also passed. The orchestrator
independently reviewed 62 viewport screenshots and live focus behavior; this is separate evidence
from successful compilation or geometry assertions. See the
[validation record](./mobile-workspace-validation.md) and [testing procedure](./testing.md) for
the focused harness command, fixture details, and evidence requirements.

These captures are reviewed artifacts, not accepted pixel-comparison baselines. No pixel baselines
are established by this refactor; future baseline adoption or replacement requires independent
review. Physical iOS/Android browser, standalone installation, software keyboard, safe-area, and
rotation checks remain **NOT RUN** and must be recorded separately from Chromium emulation.

## Known Gaps

The character-action follow-up passed 599 unit, 68 integration and 40 browser tests at clean
`0fad2dc`. Coverage now verifies dedicated health-history access, exact identity/details/editor
focus restoration, successful and partial saves, and 320 px enlarged-text action containment.
Independent screenshot and live development review are recorded in the
[acceptance record](./mobile-workspace-acceptance.md#character-action-follow-up).

- [ ] Telemetry does not yet include a metrics/traces backend beyond structured logs and Playwright traces
- [ ] No production metrics/traces backend
- [ ] Auth has no anonymous user/session cleanup, account recovery, profile settings, or session management UI yet; the Resend sender domain still needs verification for production email delivery
- [ ] Character health does not yet include death saves, rest automation, damage types, or rules-derived max HP
- [ ] Mobile workspace physical-device keyboard, safe-area, rotation, and installed-mode validation is not yet run; follow the device procedure in [mobile workspace validation](./mobile-workspace-validation.md)
- [ ] Accepted pixel-comparison baselines are not established; current viewport captures require independent visual review

---

*Last updated: 2026-09-07*
