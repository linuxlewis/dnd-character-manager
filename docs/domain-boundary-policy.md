# Domain Boundary Policy

Normal `pnpm lint` enforces the [architecture matrix](./architecture.md) over the
[resolved import graph](./domain-import-graph.md), after Biome and the retained
legacy source checks. CI invokes the same script. `pnpm lint:boundaries` runs the
strict boundary gate alone and exits nonzero for findings.
`pnpm lint:boundaries:report` remains a visibly labeled diagnostic; it exits zero
for findings, but configuration/read errors still fail. It is not an acceptance gate.
See [R10 activation evidence](./domain-strict-enforcement.md).

For structured output use
`pnpm exec tsx lints/check-boundaries.ts --report --json`.
Without `--report`, the CLI defaults to strict; unknown/conflicting flags fail.

## Concrete Module Roles

- Domain layers: `types`, `config`, `schema`, `access`, `repo`, `service`, `runtime`,
  `ui`. Unknown layers and unknown application roles produce findings.
- Public foreign entrypoints are exactly `domains/<owner>/<layer>/index.ts`.
  A nested `service/internal/index.ts` is private. Own-layer imports may use leaves.
- Application response types use `<feature>/types/`; queries use `query.ts` or
  `queries/`; workflows/routes use `workflow.ts`, `handler.ts`, `routes.ts`,
  `workflows/`, or `handlers/`; contracts use `contract.ts` or `contracts/`;
  UI/cache composition uses `ui/` or `cache/`. Put helpers under the matching role
  directory rather than adding an unclassified root helper module.
- `src/app/` is browser composition except its exact Vite config. Generated
  `src/generated/*.generated.ts` modules are browser consumers, not exemptions.
- `src/database/` is schema assembly. Providers are infrastructure; the only
  provider-to-registry edge is `providers/database/client.ts -> database/schema.ts`.
- Existing server roots (`app-server`, `api-contracts`, `server`, `prod-server`,
  `static-assets`) are composition entrypoints with bounded allowed dependencies.
- Test files and tooling outside `src/` may arrange fixtures across domains.
  Production imports of these modules fail; production-looking integration helpers
  are not silently treated as tests. Build/type checks still cover tooling.

Type-only edges follow the same ownership rules. Public service/access entrypoint
reexport chains cannot publish lower-layer repositories, schemas, or foreign APIs.
They may expose their own value-type contracts.
Imported bindings forwarded with `export { binding }`, renames, namespace bindings,
type-only forwarding, and `export default importedBinding` are modeled as reexports too. Ordinary service functions
may import their own repositories to implement the public behavior.

## Schemas And Browser Closures

Declared public FK edges are health/spellcasting/inventory to character schema,
and inventory to catalogue schema. Characters and inventory may use auth schema.
The inventory edges describe FKs already deployed in migrations, including the
catalogue `ON DELETE SET NULL` FK; R3 restores matching ORM metadata without a
new SQL migration. Add any other FK edge only with an explicit architecture update.

Schema/registry dependency closures permit domain schema definitions, leaf types,
auth schema, and assembly. Their external imports are limited to Drizzle and Zod;
initialized clients, repositories/services, and runtime globals fail. Schema and
value-contract cycles produce deterministic witness traces.

Browser roots include UI, app composition, generated clients, application response
types/contracts, and domain value types. Their transitive imports may not reach
server layers or unapproved modules, including through type-only barrels. Approved
browser auth provider leaves are `current-user.ts`, `magic-link-types.ts`, and
`sign-out-types.ts`; the mixed auth `index.ts` is server-only. Application contract
metadata may use the currently pure `openapi/index.ts` and `openapi/document.ts`;
their full closures are still checked. This does not grant UI direct access to
OpenAPI generation infrastructure.

Node builtins and known server packages (Drizzle, Postgres, Fastify, Pino, Resend,
Better Auth) fail browser closure checks. Direct `process`, `Buffer`, `__dirname`,
and `__filename` references reachable from browsers fail; `import.meta.env` is
supported. Server-only config may read environment values when unreachable from
browser roots. Ordinary property names/comments are not treated as globals.

Missing local/alias targets fail. Existing relative CSS/image/font assets are
allowed only from browser/UI modules after checking existence; unknown extensions
and missing assets fail. External package internals remain outside the graph;
TypeScript/build validation handles missing packages. Relative/absolute or resolved
alias escapes outside the project are not package exemptions. Nonliteral dynamic
imports and plain `require()` are rejected in application source; use literal ESM
imports so ownership can be checked. R1's import-equals syntax remains resolved
and subject to the same target rules; no runtime `require()` exemption is implied.

## Limits Requiring Review

This is module/binding import enforcement, not arbitrary data-flow analysis. An
exported wrapper, object property, function result, or assignment can still expose
a private capability indirectly. Review public API meaning and narrow return
values; do not claim reexport checks prove encapsulation of every returned object.
Likewise external package internals, computed evaluation, globals obtained through
indirection, and arbitrary runtime loaders are not proved safe by this checker.

`getDb` exposes registered table handles: `db.query.otherDomainTable`, SQL text,
aliased tables, and writes hidden in functions require review. Application queries
are read-only by architectural responsibility, not by an import graph's ability
to identify every SQL operation. Pure-calculation ownership is also semantic:
Zod refinements/parsers legitimately contain functions, so the checker does not
ban all functions in `types`. R2a performs that reviewed separation explicitly.

## Migration Findings At R2

This section preserves the original findings. All eight are resolved at R10;
the [closure record](./domain-strict-enforcement.md) identifies their delivered remedies.

The actual report against R2 application source has eight findings, all
`dependency-boundary`; zero unknown, unresolved, browser, schema, or cycle findings.
No application source changes are included in R2. Paths below are relative to `src/`.

| Finding | Consumer and target at R2 | Assigned remedy |
| --- | --- | --- |
| F1 | `api-contracts.ts:1` -> `catalogue/runtime/contract.ts` | R2a publishes contract through catalogue runtime index; registration uses it |
| F2 | `api-contracts.ts:2` -> `characters/runtime/contract.ts` | R2a public runtime export; R4a/R5 subsequently relocate composed contracts |
| F3 | `api-contracts.ts:3` -> `inventory/runtime/character-item-contract.ts` | R2a public inventory runtime export |
| F4 | `api-contracts.ts:4` -> `inventory/runtime/contract.ts` | R2a public inventory runtime export |
| F5 | `api-contracts.ts:5` -> `inventory/runtime/history-contract.ts` | R2a public inventory runtime export |
| F6 | `domains/characters/ui/character-detail.tsx:8` -> inventory UI | R6 moves cross-feature page assembly to application UI |
| F7 | `domains/inventory/runtime/routes.integration-helpers.ts:6` -> `app-server.ts` | R3 relocates shared integration setup under `tests/support/`; R4a uses application creation |
| F8 | Same integration helper line 7 -> private character table | R3 public schema import after fixture relocation |

Additional source-review prerequisites are not disguised as import-check findings:

R2a resolves F1-F5 through the existing public runtime indexes. Its actual report
retains only F6-F8 with the owners above; see the [R2a delivery](./domain-calculation-refactor.md).

| Coupling | Exact current modules | Remedy |
| --- | --- | --- |
| XP calculation in value types | `characters/types/character-experience.ts`: thresholds and `getCharacterExperienceProgress` | R2a moves calculation/default thresholds to owning config; types retain response schemas |
| Currency calculations in value types | `inventory/types/currency.ts`: four exported calculation functions; `inventory/types/currency-planning.ts`: planning functions | R2a moves operations to config; keep value types, schema validation/refinements, and constants required to define valid currency in types; no duplicate conversion table |
| Aggregate access contract | Inventory `character-item-service`, `character-treasury-service`, `character-history-service` and corresponding routes accept CharacterService | R4b narrow public identity service; actual writes lock and reauthorize in their own transaction |
| Mixed feature ownership | Character tables/types/health/spell UI | R3 schema boundary, R5/R6 health, R7/R8 spellcasting |
| Obsolete shape check | Legacy checker requires empty layer folders | R3 adapts shape validation to declared optional layers without disabling other legacy checks |

## R2 Verification And Handoff

Normal `pnpm test:unit` executes real-filesystem resolver/policy fixtures. They cover
negative relative/alias imports, private/nested entrypoints, local export forwarding,
allowed public service/access/schema edges, schema cycles and client leaks, browser
barrels/type-only imports, generated consumers, globals/assets, dynamic imports,
and valid application joins/contracts. Fixtures use the real TypeScript resolver.

Gate S evidence: `/tmp/domain-r2-{lint,unit,build,docs,diff,quality}.log`.
Focused fixtures: `/tmp/domain-r2-focused.log`. Actual report JSON:
`/tmp/domain-r2-findings.json`. The milestone owner supplies final counts and SHA;
the coordinator must verify them before accepting R2. No compatibility exports
or schema migrations are introduced in this milestone.

| R2 check | Result |
| --- | --- |
| `pnpm lint` | Passed; legacy enforcement remains enabled |
| `pnpm test:unit` | Passed: 176 files / 623 tests, including 48 resolver/policy fixtures |
| `pnpm build` | Passed: API freshness, TypeScript, browser/PWA, server bundles |
| `pnpm check:docs` / `git diff --check` | Passed |
| Report / strict policy commands | Same eight assigned findings; report exits 0, strict exits 1 as designed |
| `ripwire . --quality-delta` | Exit 0; no existing-symbol regressions |

Quality review separated module-load syntax recognition from the existing AST
visitor and closure diagnostics from direct-edge policy. Remaining new-symbol
observations describe the small policy dispatchers and import-binding collector;
interface dead-code observations are false positives for TypeScript-only uses.
No runtime feature code, generated artifacts, SQL migrations, or lockfile changed.
