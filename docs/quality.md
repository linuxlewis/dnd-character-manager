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
| characters | A | A | A | A | A | A | A | A1 attributes/types and A2 client-safe config add complete score/proficiency/roll schemas, rules calculations, fixed skill mappings, level proficiency boundaries, and comprehensive co-located unit coverage; A2 persistence adds migrated attribute/proficiency tables, existing-character backfill, strict database-row mappers, default creation initialization, sparse rank storage with complete-state materialization, atomic ownership-safe replacement through injected databases, repeatable-read read-only transaction options, mid-transaction rollback, direct child cascade, and concurrency coverage with invocation-safe gates and prompt rejection; A3 adds injected character authorization, server-derived scores/modifiers/proficiency/roll breakdowns, level-plus-attributes repository snapshots for GET/PUT responses with real-Postgres race coverage, atomic GET/PUT runtime contracts including malformed-path 400 coverage, generated client artifacts, and unit/route/real-Postgres integration coverage; A4 adds history-safe character section routing with independently loaded attributes, spells, and inventory views, the responsive attributes and rolls reference with search/filter/breakdown controls, atomic live-preview attribute editing with recoverable failures, level-aware recalculation, section-local retry actions, provenance copy that names level as an input, mobile overflow-safe layouts, accessible route-heading focus and named landmarks, collapsed roll provenance/source highlighting, trailing-slash route coverage, independent spell GET/search/detail retries, explicit spell action-failure recovery, geometry checks for the overflow cue, and focused co-located plus browser coverage including unsaved preview and initial-load recovery; character create/list/detail, combined detail-page character editing for name, level, and experience points, experience progress to next level, health tracking, spell slot tracking, mobile-safe editable input sizing, add/remove-spell flows, cantrip and feature spell-list entries, saved spell details, and local-catalogue spell search/save/details have unit, integration, route, generated-client, and e2e coverage; the health-flow e2e uses the catalogue-owned deterministic loopback fixture on fresh owned stacks and fails safe when a worktree stack is already running |

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

## Known Gaps

- [ ] Telemetry does not yet include a metrics/traces backend beyond structured logs and Playwright traces
- [ ] No production metrics/traces backend
- [ ] Auth has no anonymous user/session cleanup, account recovery, profile settings, or session management UI yet; the Resend sender domain still needs verification for production email delivery
- [ ] Character health does not yet include death saves, rest automation, damage types, or rules-derived max HP

---

*Last updated: 2026-09-05*
