# Feature Implementation Process

Architecture guidance updated: 2026-09-07 (target rollout described in architecture.md)

Use this process when adding or changing application behavior. Keep changes small, preserve the layered architecture, and let tests follow the testing pyramid.

## 1. Orient

- Read the relevant domain's `types/` layer first. Domain schemas define the shape everything else must obey.
- Check [quality.md](./quality.md) for known gaps in the area you are touching.
- Check [testing.md](./testing.md) before choosing test coverage.
- Check [react.md](./react.md) before changing UI components or hooks.
- Check [openapi.md](./openapi.md) before changing HTTP routes, API payloads, or generated client usage.
- Prefer existing domain patterns over new abstractions.

## 2. Design The Change By Layer

Use the dependency matrix in [architecture.md](./architecture.md). Choose the functionality
owner before choosing folders: identity, health, spellcasting, and inventory are distinct.

1. `types/`: define client-safe Zod value contracts and inferred types.
2. `config/`: pure calculations/defaults over those types; isolate server environment config.
3. `schema/`: define owned Drizzle tables and relationships; publish a narrow schema entrypoint.
4. `repo/`: read/write owned data and parse external rows. Use the character access boundary
   for transaction-bound ownership checks, not aggregate detail loading.
5. `service/`: implement domain rules; publish only deliberate cross-domain operations.
6. `runtime/`: expose feature routes/contracts. Combined responses and multi-domain creation
   belong in `application/<use-case>/`, with client-safe contracts separated from server queries.
7. `ui/`: implement feature workflows; assemble pages and combined cache coordination in the
   application. Use generated queries, Mantine, derived state, and handlers; no `useEffect`.

Skip layers that do not apply. Register persistence definitions in `src/database/schema.ts`;
put reverse cross-domain relationships in database assembly. Preserve SQL identities during
moves. Keep each relation configuration unique and the schema dependency graph acyclic.

Before implementing a composed mutation, identify its shared transaction, owner-row lock,
feature locks, and rollback scenario. Public initialization services accept the caller's
transaction and cannot begin independent transactions. No network fetches inside locked work.

## 3. Keep API Contracts Generated

When a feature adds or changes HTTP behavior:

1. Define request, response, and path parameter schemas in the owning domain `types/` layer, or application `types/` for combined contracts. Response schemas must describe JSON payloads, not internal service objects.
2. Add or update the domain route contract in `runtime/contract.ts` (or the application contract for a combined use case), including `method`, `operationId`, `path`, `responses`, and `client` metadata for browser-callable routes.
3. Register the contract from `src/api-contracts.ts`.
4. Run `pnpm api:generate` to refresh `src/generated/openapi.generated.json` and all generated client modules, keeping `src/generated/api-client.generated.ts` as the compatibility barrel.
5. Use the generated TanStack Query helpers from UI code instead of hand-written `fetch`, `queryKey`, `queryFn`, or `mutationFn` wrappers.

Use [openapi.md](./openapi.md) for the exact contract shape, client metadata fields, and verification checklist.

Generated API artifacts are committed source artifacts. `pnpm build` runs `pnpm api:check`, so stale OpenAPI/client output should fail validation before merge.

## 4. Write Tests With The Pyramid

- Add or update co-located unit tests for most logic.
- Add integration tests when the behavior depends on Postgres, route wiring, provider behavior, migrations, or another real boundary.
- Add e2e tests for critical browser journeys and visible failure states.
- Add contract/generator tests when route metadata, generated OpenAPI output, or generated client behavior changes.
- Avoid duplicating the same assertion at every layer. Unit tests should cover combinations; e2e tests should prove the journey works.

## 5. Validate

For source-only changes:

```bash
pnpm lint
pnpm test:unit
pnpm build
```

For API, database, UI, or browser-visible changes:

```bash
pnpm lint
pnpm api:check
pnpm test
pnpm check:docs
```

For Docker, production startup, or image changes:

```bash
pnpm lint
pnpm test:unit
pnpm build
pnpm build:image
pnpm check:docs
```

Use `pnpm start`, `pnpm seed`, `pnpm health`, `pnpm logs`, and `pnpm stop` when you need to inspect the running stack manually. Use `pnpm preview` for a built pseudo-production smoke check.

## 6. Update Documentation

- Update [testing.md](./testing.md) when commands or test expectations change.
- Update [react.md](./react.md) when UI patterns or component rules change.
- Update [openapi.md](./openapi.md) when API contract generation or generated client conventions change.
- Update [production.md](./production.md) when production image, Compose, runtime, or deployment commands change.
- Update [quality.md](./quality.md) when you improve coverage or identify a durable gap.
- Update [architecture.md](./architecture.md) only when the layer model or dependency rules change.
- Add a focused design note only for decisions that future agents must understand to modify the feature safely.

## Mobile Workspace Design

For character UI changes, read the [UI design contract](./ui-design.md) and
[mobile workspace specification](./mobile-character-workspace-spec.md). Follow the
[dispatch and visual validation plan](./mobile-character-workspace-plan.md) for geometry,
interaction and screenshot evidence. Target requirements and verified implementation status must
remain distinct; future agents must not import deferred Attributes & Rolls functionality.
