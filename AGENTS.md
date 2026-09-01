# AGENTS.md

This is the map. Not the manual.

## Repository Overview

This is a TypeScript monorepo using pnpm workspaces. The application follows a domain-driven, layered architecture with strict dependency rules enforced by custom linters.

## Quick Navigation

| What | Where |
|------|-------|
| Feature implementation process | [docs/implementation.md](./docs/implementation.md) |
| Architecture & dependency rules | [docs/architecture.md](./docs/architecture.md) |
| Authentication & session model | [docs/auth.md](./docs/auth.md) |
| Testing procedure | [docs/testing.md](./docs/testing.md) |
| React and Mantine UI conventions | [docs/react.md](./docs/react.md) |
| OpenAPI and typed client generation | [docs/openapi.md](./docs/openapi.md) |
| Progressive web app setup | [docs/pwa.md](./docs/pwa.md) |
| Production Docker Compose | [docs/production.md](./docs/production.md) |
| Production deployment semantics | [docs/deployment.md](./docs/deployment.md) |
| D&D MVP plan | [docs/mvp.md](./docs/mvp.md) |
| D&D 5e catalogue source strategy | [docs/superpowers/specs/2026-07-12-dnd5e-catalogue-source-strategy-design.md](./docs/superpowers/specs/2026-07-12-dnd5e-catalogue-source-strategy-design.md) |
| Character and party inventory spec | [docs/party-inventory-merge-spec.md](./docs/party-inventory-merge-spec.md) |
| Character and party inventory plan | [docs/party-inventory-merge-plan.md](./docs/party-inventory-merge-plan.md) |
| Character and party milestones | [docs/party-inventory-milestones.md](./docs/party-inventory-milestones.md) |
| Core beliefs & principles | [docs/beliefs.md](./docs/beliefs.md) |
| Quality tracking | [docs/quality.md](./docs/quality.md) |

## Stack

pnpm · TypeScript · Fastify + React/Vite · Mantine · TanStack Query · PostgreSQL + Drizzle · Zod · Vitest · Playwright · Biome · GitHub Actions · Pino · Docker Compose

## Key Rules

1. **Layered architecture is law.** Each domain follows: Types → Config → Repo → Service → Runtime → UI. Dependencies flow forward only. See [docs/architecture.md](./docs/architecture.md).
2. **Parse at the boundary.** All external data (API inputs, DB rows, env vars) must be validated with Zod schemas before entering the domain.
3. **Structured logging only.** Use the Pino logger from `src/providers/telemetry`. No `console.log`.
4. **Cross-cutting via Providers.** Database, telemetry, auth, and feature flags enter through `src/providers/`. No direct imports of cross-cutting concerns in domain code.
5. **Tests follow the pyramid.** Favor fast co-located unit tests, add integration tests for database/runtime boundaries, and add e2e tests for critical user journeys. Use `pnpm test` for full validation.
6. **React stays explicit.** Do not use `useEffect` in application source. Use `useState`, TanStack Query, Mantine components, Mantine form helpers, derived render state, and event handlers. See [docs/react.md](./docs/react.md).
7. **Docs live in the repo.** No external docs. If it's not in `docs/`, it doesn't exist.

## Common Commands

| Command | Purpose |
|---------|---------|
| `pnpm start` | Start the local Docker Postgres, API, and web stack |
| `pnpm preview` | Build the web app and run a pseudo-production stack |
| `pnpm prod:up` | Build and start the production Docker Compose stack |
| `pnpm prod:down` | Stop the production Docker Compose stack |
| `pnpm stop` | Stop the local stack and Docker resources |
| `pnpm api:generate` | Regenerate the OpenAPI spec and typed frontend client |
| `pnpm api:check` | Verify generated API artifacts are current |
| `pnpm test:unit` | Run fast co-located unit tests |
| `pnpm test:integration` | Start the stack and run database/runtime integration tests |
| `pnpm test:e2e` | Start the stack and run browser e2e tests |
| `pnpm test` | Run unit, integration, and e2e tests |
| `pnpm lint` | Run Biome and architecture checks |
| `pnpm check:docs` | Verify local Markdown links |

## Before You Start a Task

1. Read this file (you're here)
2. Read [docs/implementation.md](./docs/implementation.md)
3. Read [docs/mvp.md](./docs/mvp.md) before shaping product scope
4. Read the relevant domain's types layer first
5. Check [docs/quality.md](./docs/quality.md) and [docs/testing.md](./docs/testing.md) for known gaps and validation procedures in the area you're touching

## When You're Done

1. Run `pnpm lint && pnpm test:unit` for source-only changes
2. Run `pnpm test` for API, database, UI, or e2e changes
3. Run `git diff --check && pnpm check:docs` for documentation-only changes
4. Update [docs/quality.md](./docs/quality.md) if you improved coverage or fixed gaps
5. If you made architectural decisions, add focused docs under `docs/`
