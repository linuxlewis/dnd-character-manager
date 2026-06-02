# D&D Character Manager

A D&D 5e character management app built from the agent-first TypeScript template.

The repository is intentionally seeded before product domains are implemented. The copied `example`
domain is still present as a full-stack scaffold smoke test; replace it when the first real D&D
domain is designed.

## Quick Start

Prerequisites: Node 24, pnpm 10, Docker, and Docker Compose.

```bash
pnpm install
pnpm start      # Start Docker Compose Postgres, API, and web for this worktree
pnpm health     # Print health checks and the allocated URLs
pnpm preview    # Build and run a pseudo-production stack
pnpm prod:up    # Build and run the production Docker Compose stack
pnpm prod:down  # Stop the production Docker Compose stack
pnpm test:unit  # Fast unit tests
pnpm api:generate # Regenerate OpenAPI spec and typed frontend client
pnpm test       # Unit, integration, and e2e tests
pnpm lint       # Biome + architectural linting
pnpm check:docs # Verify doc freshness
pnpm stop       # Stop the local stack and Docker Compose resources
```

Use `pnpm logs -- --service api --lines 120` to inspect API logs. Use `pnpm seed` to reset the
temporary example data while the stack is running.

For production-style Docker Compose usage, copy `.env.production.example` to `.env.production`, set
a real `POSTGRES_PASSWORD`, then run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

See [docs/production.md](./docs/production.md) for the production image, Compose, migration, and
health-check details. See [docs/deployment.md](./docs/deployment.md) for the `dev-server-1`
deployment contract, Cloudflare Tunnel semantics, and systemd rollout procedure.

## Product Direction

See [docs/mvp.md](./docs/mvp.md) for the current MVP plan.

The first product slice should target:

- D&D 5e character management.
- Multiple users eventually, with a simple session-cookie mechanism first.
- User-entered character data before broad rules automation.
- Repo-local docs and tests before product complexity.

## Architecture

See [docs/architecture.md](./docs/architecture.md) for the full picture.

Each business domain follows a strict layered model. The React UI uses TanStack Query for
server-state fetching, mutation, caching, and invalidation. HTTP route contracts generate the
OpenAPI spec, typed frontend client, and TanStack Query helper factories; see
[docs/openapi.md](./docs/openapi.md). Progressive web app build behavior is documented in
[docs/pwa.md](./docs/pwa.md).

```text
Types -> Config -> Repo -> Service -> Runtime -> UI
```

Dependencies flow forward only. Cross-cutting concerns such as database, logging, auth, and feature
flags go through `src/providers/`.

## Parallel Development

Use `pnpm start`, `pnpm preview`, and `pnpm test` instead of hard-coded local ports. Stack commands
allocate API, web, and Postgres ports dynamically from the current worktree path, then write the
chosen URLs to `.stack/<worktree>/metadata.json`.

This lets multiple agents work in separate git worktrees on the same machine without fighting over
ports.

When an agent needs the running app URL, use `pnpm health` or read
`.stack/<worktree>/metadata.json`. Do not assume ports 3000, 4000, or 5432 are available.

## Template Seed Status

1. The project has been copied from `/home/sbolgert/workspace/agent-first-template`.
2. Package, app, API, PWA, and production image branding now use D&D Character Manager.
3. The template `example` domain remains in place only as a working vertical slice.
4. The first real domain should be designed from `types/` forward before replacing the example.
5. Keep [AGENTS.md](./AGENTS.md), [docs/implementation.md](./docs/implementation.md),
   [docs/testing.md](./docs/testing.md), [docs/openapi.md](./docs/openapi.md), [docs/pwa.md](./docs/pwa.md),
   [docs/production.md](./docs/production.md), [docs/deployment.md](./docs/deployment.md),
   [docs/react.md](./docs/react.md), and
   [docs/mvp.md](./docs/mvp.md) current as the project develops.

## For Agents

Start with [AGENTS.md](./AGENTS.md), [docs/implementation.md](./docs/implementation.md), and
[docs/mvp.md](./docs/mvp.md). Use [docs/testing.md](./docs/testing.md) for the testing procedure.

## For Humans

Your job is to:

1. Define intent: what should the system do?
2. Review agent output.
3. Encode taste into linters and docs.
