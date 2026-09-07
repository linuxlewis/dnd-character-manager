# Architecture

## Policy And Rollout

This is the target architecture for the [domain refactor](./domain-encapsulation-refactor-brief.md).
The [milestones](./domain-encapsulation-refactor-milestones.md) introduce and verify it incrementally.
Current `lints/check-deps.ts` checks alias-shaped imports and does not prove compliance for
relative imports. R1 adds resolution, R2 adds report-only policy checks, and R10 activates
repository-wide enforcement. Existing checks stay enabled throughout. See the
[baseline and decisions](./domain-encapsulation-refactor-baseline.md) for migration ownership.

## Functionality Ownership

A domain owns cohesive business rules, state, and mutations. Sharing a character ID does not
make health, spellcasting, and inventory part of character identity. Create a domain when a
feature has independent rules and persistence; use ordinary modules/components for smaller
workflows. Do not require empty layer directories or a service wrapper with no responsibility.

Characters owns identity, owner, name, class, level, and XP. Health owns HP and health history.
Spellcasting owns saved spells/features, slots, defaults, and slot history. Inventory and
catalogue retain their existing responsibilities. Application composition owns combined
responses, creation across domains, page assembly, and cross-feature cache coordination.
Future attributes owns scores, proficiencies, and derived rolls.

## Dependency Matrix

Entries list allowed project dependencies; same-layer modules within a domain may collaborate.
Imports must also satisfy browser/server safety and public-entrypoint rules. External libraries
appropriate to the layer (for example Zod in types) are allowed.

| Importer | Allowed project targets |
| --- | --- |
| Domain `types/` | Own types; explicitly exported foreign `types/index.ts` value contracts, with acyclic dependencies |
| Domain `config/` | Own types/config; client-safe pure calculations and defaults live here |
| Domain `schema/` | Own schema and leaf types; declared public foreign schemas for FKs; auth persistence schema |
| Domain `repo/` | Own types/config/schema/repo; database and relevant server providers |
| Domain `service/` | Own lower layers/service; other domains' public `service/index.ts` and `types/index.ts` |
| Domain `runtime/` | Own lower layers/runtime; foreign public service/types; server providers |
| Domain `ui/` | Own UI and public client-safe types/config; generated client; browser-safe providers |
| `application/<feature>/types/` | Public domain types and other client-safe application types |
| `application/<feature>/query.ts` | Public schemas, database handle, public service/types/config; explicit reads only |
| Application workflows/handlers | Public domain services/types, database transaction machinery, own queries/contracts |
| Application contracts | Own client-safe response types, public domain types, provider contract types |
| Application UI/cache modules | Public domain UI/types/config, generated clients, browser-safe providers |
| `database/` assembly | Public domain schemas, auth schema, Drizzle; no repositories/services/client initialization |
| Providers | Provider infrastructure; no domain business rules; database registry exception below |

Public contracts are layer-specific `index.ts` exports, never an all-purpose domain barrel.
A foreign public type is a value contract, not permission to import its implementation.
Nested `index.ts` files are private. Public service/access reexport chains cannot expose
lower-layer repositories or schemas; ordinary service implementations may use own repositories.
Cross-domain config imports are for application composition only; a domain's pure function
receives inputs rather than importing another domain's calculation. Shared calculations live
in the owning domain's client-safe `config/`, importing `types/`; types never import config.
Do not introduce a generic shared-business/provider package or configuration injection solely
for layer ordering. Server environment config must not enter any browser dependency closure.

The only lower-layer behavioral collaboration exception is
`characters/access/index.ts`: a narrow persistence access API implemented over the character
schema and database transaction type. Feature repositories may use it to obtain an owned
identity or lock it within their transaction. It never loads feature aggregates and exports no
general character repository. It may import its own types/schema and database infrastructure,
not services, runtime, application, or feature state. R4 implements this boundary.

## Domain-Owned Persistence

Define tables once in `domains/<owner>/schema/`; publish them through `schema/index.ts`.
These server-only modules contain physical mappings and relationships, not database queries.
Health, spellcasting, and inventory schema may import `characters/schema/index.ts`.
Inventory may also import `catalogue/schema/index.ts` for its deployed catalogue FK; character schema may
import `providers/auth/schema.ts` for the owner FK. Inventory and catalogue publish their
existing models similarly. Add other schema edges only with a documented FK requirement;
all schema dependencies must remain acyclic.

Local and owning-side relations stay with their domain. Reverse cross-domain relationships
live in `database/character-relations.ts`. `database/schema.ts` registers every table and
relation configuration exactly once. Do not export competing `relations(...)` definitions for
one table. Drizzle relation metadata complements, rather than replaces, physical foreign keys.

`providers/database/client.ts` may import the assembled registry to initialize
`drizzle(client, { schema })`. This is a specific composition exception: the registry's entire
closure must consist of schema definitions and leaf types, never initialized clients. Preserve
inferred database and transaction types. No domain schema may import the registry or provider
client. Provider lifecycle code stays infrastructure-only.

General cross-domain reads belong to application queries using Drizzle related loading or
explicit joins. Repositories write only their owner's tables. Public schemas do not authorize
cross-domain writes. Import checks cannot detect every use of `db.query.otherTable`, SQL text,
or an aliased table handle: reviewers must inspect table access and transaction collaborators.
Do not claim import enforcement alone proves data ownership.

SQL migrations live under `migrations/` and use the `schema_migrations` ledger. Preserve physical
table names, keys, indexes, and deployed migrations during moves. Add a new migration for an
actual schema change; never edit a migration that may have run in a shared environment.

## Composition And Transactions

Character-detail query and JSON contract belong to `application/character-detail/` and reuse
public domain types. Maintain current URLs, operation IDs, generated client calls, response
fields, status codes, and feature behavior. Raw relational results are not API responses:
select required fields, derive values using owning-domain calculations, and parse the boundary.
Related loading must remain owner-scoped; it does not grant access by itself.

Character creation is an application workflow sharing one database transaction between narrow
public domain initialization services. Those services use the supplied transaction and write
only their own tables. A health initialization failure rolls back identity creation. Avoid
nested independent transactions, events for mandatory initialization, and provider business logic.

For feature mutations, lock the owned character row before reading mutable feature state or
writing it, using the same transaction throughout. Ownership transfer updates the same identity
row and serializes with this lock. When several characters are involved, acquire identity locks
in ID order, then feature locks in a documented stable order. Do not hold transactions open
while fetching catalogue/network data. Revalidate relevant context after acquiring the lock.
Read compositions needing a coherent snapshot use one relational statement or one snapshot
transaction; an earlier owner lookup alone cannot authorize a later write.

## Enforcement And Browser Safety

R1/R2 resolve relative paths, aliases, `.js` to TypeScript, re-exports, and literal dynamic
imports using TypeScript resolution. Type-only imports obey the same ownership matrix; they
cannot tunnel into private repositories. Browser closures may not depend on schema, repo,
service, runtime, database assembly, or server providers, including via barrels. Generated
client parsers must import only client-safe domain/application contracts.

Unresolved local/alias project imports are errors. Resolved external packages are classified
separately; nonliteral dynamic imports require explicit review and cannot bypass a boundary.
Cycle detection and forbidden transitive dependencies must terminate and report useful traces.
Cross-cutting logging uses Pino through telemetry providers; no `console.*` in application code.

## File And Test Conventions

Co-locate meaningful tests (`foo.test.ts`, database boundaries `foo.integration.test.ts`).
Entrypoints, generated files, and narrow barrels follow the existing shape-check exceptions.
Maximum file size remains 300 lines. Zod schemas use `<Thing>Schema` and inferred types.
UI uses generated TanStack Query helpers; no `useEffect`. Follow
[implementation.md](./implementation.md), [openapi.md](./openapi.md), and [testing.md](./testing.md).

The [R2 policy and migration ledger](./domain-boundary-policy.md) specifies executable
module naming, approved browser/provider leaves, FK edges, and analysis limits.
