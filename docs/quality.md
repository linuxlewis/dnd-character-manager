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
| characters | B | B | B | B | B | B | B | Character create/list/detail and detail-page health tracking have unit, integration, route, and e2e coverage |

## Cross-Cutting

| Provider | Grade | Notes |
|----------|-------|-------|
| auth | B | Better Auth anonymous sessions, magic-link sign-in/sign-out, anonymous character transfer, Postgres-backed tables, and current-state documentation are wired; production email delivery remains future work |
| database | B | Postgres provider wired through Docker Compose stack |
| telemetry | B | Pino logger, request IDs, route timings, and stack log files are wired; metrics/traces are future work |
| openapi | B | Route contracts generate `openapi.generated.json` and a typed frontend client; broader coverage should grow as domains are added |
| pwa | B | Vite production builds emit a web manifest, service worker, installability icons, and static asset MIME handling; offline API data is intentionally out of scope |
| production | B | Node 24 multi-stage Docker image and production Compose stack are documented; deployment hardening remains environment-specific |
| feature-flags | D | Placeholder |

## Known Gaps

- [ ] Telemetry does not yet include a metrics/traces backend beyond structured logs and Playwright traces
- [ ] No production metrics/traces backend
- [ ] Auth has no anonymous user/session cleanup, account recovery, profile settings, session management UI, or production email delivery yet
- [ ] Character health does not yet include death saves, rest automation, damage types, or rules-derived max HP

---

*Last updated: 2026-07-12*
