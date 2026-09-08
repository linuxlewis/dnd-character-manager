# Domain Refactor Module Map

Verified against assembled implementation
`2824232f0b9acd844868025bd747607175042dfd` (R10), compared with historical baseline
`faf519271e2b06a825025ba433c38005340b116e`. This is the integration map for later
attributes work; [acceptance evidence](./domain-refactor-acceptance.md) records
verification and [attributes adaptation](./domain-attributes-adaptation.md) records
remaining behavioral decisions.

## Ownership Map

Paths in this table are relative to `src/`. Foreign domain imports use the listed layer's `index.ts`, not the implementation leaves in this map.

| Baseline module/responsibility | Final destination / contract |
| --- | --- |
| `domains/characters/repo/character-table.ts`, identity table | `domains/characters/schema/tables.ts`; public `schema/index.ts` exports `charactersTable` |
| Same mixed table file, health and health event tables | `domains/health/schema/tables.ts`; owning FK relations in `schema/relations.ts`, exported by `schema/index.ts` |
| Same mixed table file, slots, slot events, saved spells | `domains/spellcasting/schema/tables.ts`; owning FK relations in `schema/relations.ts`, exported by `schema/index.ts` |
| Catalogue `repo/catalogue-item-table.ts`, `repo/catalogue-spell-table.ts` | Corresponding leaves under `domains/catalogue/schema/`; public `schema/index.ts` |
| Inventory `repo/inventory-{scope,item,treasury,history}-table.ts` | Corresponding leaves under `domains/inventory/schema/`; relations in `schema/relations.ts`, public `schema/index.ts` |
| Mixed `characters/types/character.ts` and `types/index.ts` | Identity contracts stay in characters; health value/request/response contracts move to `health/types/index.ts`; spell/slot contracts to `spellcasting/types/character.ts` via `types/index.ts`; composed create/detail contracts to `application/character-detail/types/index.ts` |
| XP calculation in `characters/types/character-experience.ts` | `characters/config/character-experience.ts`, public `config/index.ts`: `getCharacterExperienceProgress`, `DND_5E_EXPERIENCE_THRESHOLDS`; value schemas remain in types |
| Health normalization/history conversion in character implementation | `health/config/health-update.ts` and `health-mappers.ts`; public config exports `normalizeHealthUpdate`, `toHealthChange`, `toCharacterHealth`, `toHealthChangeResponse` |
| Spell slot calculation/bucket validation in mixed character code | `spellcasting/config/spell-slots.ts`, `spell-buckets.ts`; public config exports `applySpellSlotChange`, `normalizeSpellSlotConfiguration`, `assertSpellCanSaveToBucket` |
| Currency and planning calculations in `inventory/types` | `inventory/config/currency.ts`, `currency-planning.ts`, public config index; value schemas/refinements remain types |
| `characters/repo/character-repo.ts`, `character-row.ts` | Deleted legacy factory/mapper. Do not resurrect `CharacterRepo`, `CreateCharacterRecord`, or `createCharacterRepo` for later features |
| `characters/repo/character-repository.ts` | Retained but narrowed to identity; public `CharacterRepository` and `createCharacterRepository` |
| `characters/repo/character-health-repository.ts` | `health/repo/character-health-repository.ts`; public `CharacterHealthRepository`, `createCharacterHealthRepository` |
| Character spell/slot repos and D&D spell clients | Corresponding leaves under `spellcasting/repo/`; public spellcasting repo index owns these factories/types |
| `characters/service/character-service.ts` | Identity service only. Public `CharacterService`, `createCharacterService`, `initializeCharacterIdentity`, `requireOwnedCharacter`, `CharacterNotFoundError` |
| `characters/service/character-health-service.ts` | `health/service/character-health-service.ts`; public `CharacterHealthService`, `createCharacterHealthService`, `initializeCharacterHealth` |
| Character spell/slot services, catalogue-backed adapter | Corresponding leaves under `spellcasting/service/`; public factories/types through service index. Spell errors owned in `spellcasting/types/errors.ts` and exposed through service index |
| `characters/runtime/routes.ts` and `contract.ts`, create/detail/name/level/XP | `application/character-detail/handlers/{create-character,detail}.ts`, `contract.ts`, `workflows/`; five composed operations |
| Same character runtime files, health update | `health/runtime/routes.ts` and `contract.ts`; runtime index publishes registration/contracts |
| Character slot routes and `routes.spells.ts`, `character-spell-contracts.ts`, support/helper files | `spellcasting/runtime/` equivalents, public runtime index; all ten existing spell operations |
| Character runtime, list | Remains `characters/runtime/`; identity list remains character-owned |
| `characters/ui/{character-detail,character-workspace,create-character-form}.tsx` | `application/character-detail/ui/` equivalents; application UI index exports `CharacterWorkspace`; page/form remain application implementation leaves |
| `characters/ui/health-{panel,dialogs}.tsx`, `health-display.ts` | `health/ui/` equivalents; public `CharacterHealthPanel` through UI index |
| `characters/ui/spell-*.tsx`, `spell-slot-format.ts`, `non-slot-spell-list.tsx` | `spellcasting/ui/` equivalents; public `CharacterSpellSlotsPanel` through UI index at the final implementation |
| Character list/editor/XP panel/route helpers | Remain in `characters/ui/`; shared form validation leaf is `character-form-validation.ts` |

Git's rename heuristic matches the old mixed `character-table.ts` with spellcasting's new table file. That is not evidence that identity or health tables belong to spellcasting: inspect symbols, not rename labels.

## Public access and transaction contracts

`domains/characters/access/index.ts` contains the small repository-safe access exception:

```ts
findOwnedCharacter(userId: string, characterId: string, connection: DatabaseConnection)
lockOwnedCharacter(userId: string, characterId: string, transaction: DatabaseTransaction)
```

Both return parsed `CharacterSummary | null` containing id/name/className/level. The lock variant selects owned identity with `FOR UPDATE`. `DatabaseConnection = Database | DatabaseTransaction`; the transaction type comes from the registered Drizzle database through `@providers/database/index.js`.

`requireOwnedCharacter(userId, characterId)` is the service convenience returning a summary or throwing `CharacterNotFoundError`. It performs a read using the root database. It is not a substitute for the repository's ownership recheck/lock inside an actual mutation transaction. Inventory uses this narrowed service contract for orchestration, then locks identity through access inside writes; do not reinject the former aggregate CharacterService into inventory.

Feature mutation ordering is identity lock first, then feature read/lock, current-state calculation, writes/history, and response within the same transaction. Do not convert R5/R7 transaction commands back into a service-precomputed snapshot save. Health keeps its existing absolute request contract; R7 slot commands preserve concurrent usage. Saved-spell add/remove reauthorize and return the list in their transaction. Remote lookup occurs outside locks. Defaults fetch allows at most two total attempts, compares both class and level after locking, and makes no writes for stale context; second mismatch is existing 502, ownership loss 404.

## Composed creation and detail

Creation entry point at `application/character-detail/workflows/create-character.ts:9`:

```ts
export async function createCharacter(
  input: CreateCharacterRequest & { userId: string },
  initializeHealth = initializeCharacterHealth,
) {
  const characterId = await getDb().transaction(async (transaction) => {
    const id = await initializeCharacterIdentity(input.userId, input, transaction);
    await initializeHealth(id, input.maxHp, transaction);
    return id;
  });
  return getCharacter(input.userId, characterId);
}
```

Public identity initialization takes `(userId, input: Omit<CharacterSummary, "id">, transaction)`; health initialization takes `(characterId, maxHp, transaction)`. Each validates at its own boundary and invokes its private insert. The application supplies one transaction; initialization must not open independent transactions. A later attributes initializer should follow this shape and participate before commit. The composed response is read after commit; do not describe the response read as part of the initialization transaction. Spellcasting currently needs no creation rows; empty/default representations remain lazy.

The deleted legacy creation factory used a separate `class` input shape and optional maxHp default. It is not a compatibility entry point. Update any historical attributes initializer or fixture to the public application workflow instead of restoring it.

`application/character-detail/query.ts:10` exports `getCharacter(userId, characterId, connection = getDb())`. It performs an owner-filtered Drizzle `query.charactersTable.findFirst` with explicit identity columns and `with: { health, healthEvents }`. Health events are newest-first, limited to five. It maps through public health config functions and parses `CharacterDetailSchema`. Missing owned identity or required health produces `CharacterNotFoundError` (HTTP404). This is the concrete existing relational composition pattern; there is no arbitrary client-controlled include endpoint or homegrown ORM.

`workflows/character-detail.ts:13` exports `createCharacterDetailService(identity = createCharacterService())`: detail reads use the query; name/level/XP updates call the identity service, then read composed detail. Identity update methods now return the ID (`Promise<string>`), not the aggregate. Five public operations retain existing paths and envelopes: POST `/api/characters`, GET `/api/characters/:characterId`, PUT `.../name`, `.../level`, `.../experience`. `CharacterDetailResponse` remains `{ character: ... }` with identity, XP/progress, health, recentHealthChanges. Routes do not imply that all these data owners belong to the character domain. Adding attributes to detail requires extending the application projection/schema, not adding feature persistence to the identity service. Level/XP integration tests protect the absence of automatic health/slot resets.

## Database registration and dependency direction

- `src/database/schema.ts` statically exports all five domain schema indexes, four auth tables, and central `characterRelations`; all 17 table registrations remain.
- `src/database/character-relations.ts` owns inverse identity relations: owner, health, healthEvents, spellSlots, spellSlotEvents, spells, inventoryScope. Feature schemas own their forward FK definitions/relations to identity. This avoids identity schema importing every feature and forming cycles.
- `src/providers/database/client.ts` imports the registry and creates `drizzle(client, { schema })`; `drizzle.config.ts` points at `./src/database/schema.ts`. Schema-only imports do not instantiate a database or require DATABASE_URL.
- A later attributes schema should own its tables/forward relations, export through its public schema index, register once centrally, and add the inverse relation centrally when needed. Its FK edge must also be declared in boundary policy. Preserve deployed SQL identities; new attributes DDL is a later feature migration, not a reason to recreate the extracted tables.
- Application queries may join public schemas for read projections. Writes go through public owning services and their transaction contracts. Domain code cannot import application composition. Public index/type-only imports do not waive browser/server closure rules. The linter cannot prove SQL is read-only or that `db.query.foreignTable` obeys ownership; final review must check semantics.

## Generated clients and cache coordination

`src/api-contracts.ts` and `src/app-server.ts` assemble owning runtime exports plus application routes/contracts. Regenerate `src/generated/*.generated.ts` from contracts; do not manually preserve old character-domain imports. Client function names, operation IDs, URLs, and JSON envelopes remain stable at the final implementation; TypeScript type/parser ownership changes. Application create/detail types must remain browser-safe, as must public domain types and config reachable by UI.

`application/character-detail/cache/health.ts` exports `applyHealthResponse(queryClient, characterId, response)`. It updates only health/recentHealthChanges within an existing `getCharacter({ characterId })` cache value, preserving other composed fields and declining to synthesize an incomplete aggregate on a miss. Health UI receives `onHealthUpdated(response, characterId)` and supplies `variables.params.characterId` after mutation success. The application wires that callback; health does not import application response types or update the composed cache directly.

Spellcasting UI uses its generated spell/slot query keys; application character detail mounts the public panel. Future attributes-derived detail/health/spell displays require an explicit application cache update/invalidation plan keyed by originating character. Do not allow feature UI to import aggregate application types or use current navigation state to choose the cache receiving an old response. Do not assume a level response updates independently cached spell/attribute queries automatically.

## Spell Workflow Owners

Accepted R9 `cc6387549d8bd82295761f7eeb3f6050ddc8ae5a` gives the existing
search/details/remove modals their own asynchronous queries, mutations, errors,
and explicit retries. `CharacterSpellSlotsPanel` retains slots, edit drafts, and
one dialog discriminator carrying the originating character ID. Forwarding-only
edit-actions/alerts wrappers are deleted; no generic workflow framework replaces them.

Generated query keys and mutation-variable IDs target the originating character.
The object-identity close guard prevents an old completion closing a newer dialog;
pending guards prevent repeated saves/removals and closing pending dialogs.
Slot mutation errors survive editing/dialog changes. This is not a deduplication
or lost-response reconciliation protocol. Real browser evidence covers failures,
retry, stale search, unrelated-query avoidance and late A-to-B completion. See
[workflow implementation and validation](./domain-spell-workflows.md).

## Later attributes adaptation conflict checklist

1. Re-home new attributes schema/types/config/repo/service/runtime/UI in a dedicated attributes domain. Convert old private character imports to legal public layer imports and declare the new schema relationship. Do not extend character value barrels into aggregate feature exports.
2. Integrate required initial attributes through the application creation transaction. Move historic edits to deleted character creation factories/rows into that workflow and public initializer. Reconcile migration `0014_character_attributes.sql` with final migration history; regenerate the schema/client artifacts from final contracts.
3. Move composed attributes detail fields and response parsing into the application types/query. Keep identity name/level/XP writers narrow. Choose explicit domain services/workflow if new attributes rules require coordinated writes; do not hide them in a joined read.
4. Reapply health changes to the health owner and spell changes to spellcasting, preserving identity-first transaction semantics. Historical delta/recovery/validation risks and required focused tests are in the [attributes handoff](./domain-attributes-adaptation.md), not resolved by path movement.
5. Adapt old character detail/workspace/editor changes to application UI and public feature panels. Map any historical recovery hook to R9's final workflow owner rather than recreating the old monolithic panel. Preserve originating-character cache updates and close guards.
6. Regenerate contract/client metadata and verify response compatibility. Explicitly coordinate attributes/level changes with affected detail/health/spell caches. Validate absent required relations, cross-owner access, initialization rollback, history, concurrent mutations, and mounted async UI behavior at the later adaptation SHA.
