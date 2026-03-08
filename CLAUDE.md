# CLAUDE.md

Entry point for AI agents working in this codebase.

## Repository Overview

TypeScript monorepo using pnpm workspaces. Domain-driven, layered architecture with strict dependency rules enforced by custom linters.

## Stack

pnpm · TypeScript · Fastify + React/Vite · PostgreSQL + Drizzle · Zod · Vitest · Biome · GitHub Actions · OTel + Pino · Docker Compose

## Step-by-Step Workflow

Follow these steps for every coding task.

### 1. Understand the Task

- Read this file first (you're here).
- Check [plans/active/](./plans/active/) for related in-progress work.
- Identify which domains and layers the task will touch.

### 2. Review the Architecture

- Read [docs/architecture.md](./docs/architecture.md) to understand the layered architecture and dependency rules.
- Each domain follows: **Types -> Config -> Repo -> Service -> Runtime -> UI**. Dependencies flow forward only.
- Check the domain's `types/` layer first — it is the foundation for everything above it.

### 3. Follow Project Conventions

- **Parse at the boundary.** All external data (API inputs, DB rows, env vars) must be validated with Zod schemas before entering the domain.
- **Structured logging only.** Use the Pino logger from `src/providers/telemetry`. No `console.log`.
- **Cross-cutting via Providers.** Auth, telemetry, feature flags enter through `src/providers/`. No direct imports of cross-cutting concerns in domain code.
- **File conventions.** One export per file preferred. Max 300 lines per file. Schemas named `<Thing>Schema`, types inferred as `type Thing = z.infer<typeof ThingSchema>`.
- See [docs/beliefs.md](./docs/beliefs.md) for core principles.

### 4. Write Tests

- Read [docs/testing.md](./docs/testing.md) for testing conventions per layer.
- Every new module must have a co-located test file (`foo.ts` -> `foo.test.ts`).
- Follow the testing patterns for the layer you're working in (types, repo, service, runtime, UI).
- Clean up state between tests using `beforeEach`/`afterEach` with `repo._clear()`.

### 5. Validate Before Pushing

Run both checks — they must pass before any code is pushed or a PR is opened:

```bash
pnpm lint && pnpm test
```

- Fix any lint errors reported by Biome.
- Fix any failing tests.
- If you improved coverage or fixed quality gaps, update [docs/quality.md](./docs/quality.md).

### 6. Keep Documentation Up to Date

These docs are the source of truth. When your changes affect how the project works, update the relevant docs **in the same commit**.

- **New or changed conventions** (coding patterns, naming, file structure) -> update this file (`CLAUDE.md`).
- **Architectural changes** (new layers, dependency rules, new domains, new providers) -> update [docs/architecture.md](./docs/architecture.md).
- **Testing changes** (new test tooling, new patterns, new layer-specific conventions) -> update [docs/testing.md](./docs/testing.md).
- **Quality improvements** (better coverage, fixed gaps) -> update [docs/quality.md](./docs/quality.md).
- **Architectural decisions** (why something was built a certain way) -> add a doc to [docs/design/](./docs/design/).
- **New documentation** -> add an entry to [docs/catalog.md](./docs/catalog.md).

Plans live in the repo. If it's not in `plans/` or `docs/`, it doesn't exist.

## Quick Navigation

| What | Where |
|------|-------|
| Architecture & dependency rules | [docs/architecture.md](./docs/architecture.md) |
| Testing conventions | [docs/testing.md](./docs/testing.md) |
| Design documents | [docs/design/](./docs/design/) |
| Core beliefs & principles | [docs/beliefs.md](./docs/beliefs.md) |
| Quality tracking | [docs/quality.md](./docs/quality.md) |
| Documentation catalog | [docs/catalog.md](./docs/catalog.md) |
| Active plans | [plans/active/](./plans/active/) |
| Completed plans | [plans/completed/](./plans/completed/) |
| Technical debt | [plans/debt.md](./plans/debt.md) |
