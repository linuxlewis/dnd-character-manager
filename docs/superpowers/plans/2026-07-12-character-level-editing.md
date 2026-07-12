# Character Level Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build level-only editing for existing characters from the character detail page.

**Architecture:** Follow the repository's Types -> Config -> Repo -> Service -> Runtime -> UI dependency flow. Add a focused update-level request schema and route, persist only `characters.level`, return refreshed character detail, and use generated TanStack Query mutation helpers in the UI.

**Tech Stack:** TypeScript, Zod, Drizzle, Fastify, React, Mantine, TanStack Query, Vitest, Playwright, pnpm.

## Global Constraints

- Character level must remain a whole number from 1 to 20 via `CharacterLevelSchema`.
- A level edit must not update spell slot totals, saved spells, class, name, or health.
- Existing manual spell slot configuration remains user-owned; applying defaults remains explicit.
- External data and API bodies must be parsed with Zod at boundaries.
- UI code must not use `useEffect`.
- Browser API calls must use generated client/query/mutation helpers.
- API, database, UI, or browser-visible changes require `pnpm lint`, `pnpm test`, and `pnpm check:docs`.

---

## File Structure

- Modify `src/domains/characters/types/character.ts`: add `UpdateCharacterLevelRequestSchema` and exported type.
- Modify `src/domains/characters/types/character.test.ts`: add schema coverage for valid and invalid update-level payloads.
- Modify `src/domains/characters/repo/character-repository.ts`: add `updateCharacterLevel(userId, characterId, level)`.
- Modify `src/domains/characters/repo/character-repository.integration.test.ts`: prove level persistence and unchanged health detail.
- Modify `src/domains/characters/service/character-service.ts`: add `updateCharacterLevel`.
- Modify `src/domains/characters/service/character-service.test.ts`: prove service delegates and maps null to `CharacterNotFoundError`.
- Modify `src/domains/characters/runtime/contract.ts`: add route contract and generated client metadata.
- Modify `src/domains/characters/runtime/contract.test.ts`: add `updateCharacterLevel` operation and adjusted path-param count.
- Modify `src/domains/characters/runtime/routes.ts`: add `PUT /api/characters/:characterId/level`.
- Modify `src/domains/characters/runtime/routes.test.ts`: add route unit coverage.
- Modify `src/domains/characters/runtime/routes.integration.test.ts`: prove persisted level, list refresh data, and session scoping.
- Modify `src/domains/characters/ui/character-detail.tsx`: add level edit form/modal and cache updates.
- Modify `src/domains/characters/ui/character-detail.test.tsx`: ensure edit affordance renders.
- Modify `tests/e2e/character-creation.spec.ts`: cover edit-level browser journey.
- Regenerate `src/generated/openapi.generated.json` and `src/generated/api-client.generated.ts`.

### Task 1: Types And Contract

**Files:**
- Modify: `src/domains/characters/types/character.ts`
- Modify: `src/domains/characters/types/character.test.ts`
- Modify: `src/domains/characters/runtime/contract.ts`
- Modify: `src/domains/characters/runtime/contract.test.ts`

**Interfaces:**
- Produces: `UpdateCharacterLevelRequestSchema`, `UpdateCharacterLevelRequest`, generated client metadata for `updateCharacterLevel(params, body)`.

- [ ] **Step 1: Write failing schema and contract tests**

Add this import in `src/domains/characters/types/character.test.ts`:

```ts
UpdateCharacterLevelRequestSchema,
```

Add this test block:

```ts
describe("UpdateCharacterLevelRequestSchema", () => {
	it("accepts a valid character level update", () => {
		expect(UpdateCharacterLevelRequestSchema.parse({ level: 8 })).toEqual({ level: 8 });
	});

	it("rejects levels outside the D&D character range", () => {
		expect(() => UpdateCharacterLevelRequestSchema.parse({ level: 0 })).toThrow();
		expect(() => UpdateCharacterLevelRequestSchema.parse({ level: 21 })).toThrow();
	});
});
```

Update `src/domains/characters/runtime/contract.test.ts` expected arrays to include `updateCharacterLevel` immediately after `getCharacter`, and increase the path-param route count from `11` to `12`.

- [ ] **Step 2: Run tests to verify red**

Run: `pnpm exec vitest run src/domains/characters/types/character.test.ts src/domains/characters/runtime/contract.test.ts`

Expected: fail because `UpdateCharacterLevelRequestSchema` and `updateCharacterLevel` contract do not exist.

- [ ] **Step 3: Add schemas and route contract**

Add to `src/domains/characters/types/character.ts` after `CharacterDetailResponseSchema`:

```ts
export const UpdateCharacterLevelRequestSchema = z.object({
	level: CharacterLevelSchema,
});
export type UpdateCharacterLevelRequest = z.infer<typeof UpdateCharacterLevelRequestSchema>;
```

Add `UpdateCharacterLevelRequestSchema` to the imports in `src/domains/characters/runtime/contract.ts`.

Add this contract immediately after the `getCharacter` contract:

```ts
{
	method: "put",
	operationId: "updateCharacterLevel",
	path: "/api/characters/:characterId/level",
	pathParams: CharacterPathParamsSchema,
	requestBody: UpdateCharacterLevelRequestSchema,
	responses: {
		200: { description: "Updated character level", schema: CharacterDetailResponseSchema },
		400: { description: "Invalid character level", schema: ErrorResponseSchema },
		404: { description: "Character not found", schema: ErrorResponseSchema },
	},
	summary: "Update character level",
	tags: ["characters"],
	client: {
		functionName: "updateCharacterLevel",
		imports: [...characterTypeImports, ...characterSchemaImports],
		pathParamsType: "{ characterId: string }",
		requestBodyType: "UpdateCharacterLevelRequest",
		responseParser: "CharacterDetailResponseSchema",
		responseType: "CharacterDetailResponse",
	},
},
```

- [ ] **Step 4: Verify green**

Run: `pnpm exec vitest run src/domains/characters/types/character.test.ts src/domains/characters/runtime/contract.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Run: `git add src/domains/characters/types/character.ts src/domains/characters/types/character.test.ts src/domains/characters/runtime/contract.ts src/domains/characters/runtime/contract.test.ts && git commit -m "Add character level update contract"`

### Task 2: Repo, Service, And Runtime Route

**Files:**
- Modify: `src/domains/characters/repo/character-repository.ts`
- Modify: `src/domains/characters/repo/character-repository.integration.test.ts`
- Modify: `src/domains/characters/service/character-service.ts`
- Modify: `src/domains/characters/service/character-service.test.ts`
- Modify: `src/domains/characters/runtime/routes.ts`
- Modify: `src/domains/characters/runtime/routes.test.ts`
- Modify: `src/domains/characters/runtime/routes.integration.test.ts`

**Interfaces:**
- Consumes: `UpdateCharacterLevelRequest`
- Produces: `CharacterRepository.updateCharacterLevel(userId: string, characterId: string, level: number): Promise<CharacterDetail | null>` and `CharacterService.updateCharacterLevel(userId: string, characterId: string, input: UpdateCharacterLevelRequest): Promise<CharacterDetail>`.

- [ ] **Step 1: Write failing service and route tests**

Add service tests proving delegation and not-found mapping:

```ts
it("updates a character level through the repository", async () => {
	const repository = {
		updateCharacterLevel: vi.fn(async () => ({
			id: "00000000-0000-4000-8000-000000000001",
			name: "Mira",
			className: "Fighter",
			level: 8,
			health: { currentHp: 18, maxHp: 18, temporaryHp: 0, effectiveMaxHp: 18 },
			recentHealthChanges: [],
		})),
	} as unknown as CharacterRepository;

	await expect(
		createCharacterService(repository).updateCharacterLevel("user-1", "character-1", {
			level: 8,
		}),
	).resolves.toMatchObject({ level: 8 });

	expect(repository.updateCharacterLevel).toHaveBeenCalledWith("user-1", "character-1", 8);
});

it("throws not found when a character level cannot be updated", async () => {
	const repository = {
		updateCharacterLevel: vi.fn(async () => null),
	} as unknown as CharacterRepository;

	await expect(
		createCharacterService(repository).updateCharacterLevel("user-1", "missing", { level: 8 }),
	).rejects.toThrow(CharacterNotFoundError);
});
```

Add route unit tests for valid update, invalid payload, and missing character. Add integration coverage that creates a character at level 3, updates to level 8, then verifies detail and list responses show level 8 while another session receives 404.

- [ ] **Step 2: Run tests to verify red**

Run: `pnpm exec vitest run src/domains/characters/service/character-service.test.ts src/domains/characters/runtime/routes.test.ts`

Expected: fail because service and route methods do not exist.

- [ ] **Step 3: Implement repository and service**

Add `updateCharacterLevel` to `CharacterRepository`, update the table row with `level` and `updatedAt: new Date()`, and reload detail through `findCharacterDetail`.

Add service method:

```ts
async updateCharacterLevel(userId, characterId, input) {
	const character = await repository.updateCharacterLevel(userId, characterId, input.level);
	if (!character) throw new CharacterNotFoundError();
	return character;
},
```

- [ ] **Step 4: Implement route**

Import `UpdateCharacterLevelRequestSchema` in `src/domains/characters/runtime/routes.ts`.

Add route after `GET /api/characters/:characterId`:

```ts
app.put("/api/characters/:characterId/level", async (request, reply) => {
	const params = parseParams(request, reply);
	if (!params) return;

	const body = parseBody(UpdateCharacterLevelRequestSchema, request.body, reply);
	if (!body) return;

	const currentUser = await getCurrentUser(request, reply);
	try {
		const character = await characterService.updateCharacterLevel(
			currentUser.user.id,
			params.characterId,
			body,
		);
		return { character };
	} catch (error) {
		if (error instanceof CharacterNotFoundError) {
			return reply.status(404).send({ error: "Character not found." });
		}
		throw error;
	}
});
```

- [ ] **Step 5: Verify green**

Run: `pnpm exec vitest run src/domains/characters/service/character-service.test.ts src/domains/characters/runtime/routes.test.ts`

Expected: pass.

Run: `pnpm test:integration -- src/domains/characters/repo/character-repository.integration.test.ts src/domains/characters/runtime/routes.integration.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Run: `git add src/domains/characters/repo/character-repository.ts src/domains/characters/repo/character-repository.integration.test.ts src/domains/characters/service/character-service.ts src/domains/characters/service/character-service.test.ts src/domains/characters/runtime/routes.ts src/domains/characters/runtime/routes.test.ts src/domains/characters/runtime/routes.integration.test.ts && git commit -m "Implement character level update API"`

### Task 3: Character Detail UI And E2E Flow

**Files:**
- Modify: `src/domains/characters/ui/character-detail.tsx`
- Modify: `src/domains/characters/ui/character-detail.test.tsx`
- Modify: `tests/e2e/character-creation.spec.ts`

**Interfaces:**
- Consumes: generated `apiMutations.updateCharacterLevel`, `apiQueryKeys.getCharacter`, and `apiQueryKeys.listCharacters`.
- Produces: visible level edit affordance on the detail page and mutation-driven detail/list refresh.

- [ ] **Step 1: Regenerate client before UI tests**

Run: `pnpm api:generate`

Expected: generated client includes `UpdateCharacterLevelRequest`, `apiClient.updateCharacterLevel`, and `apiMutations.updateCharacterLevel`.

- [ ] **Step 2: Write failing UI/e2e tests**

Update `src/domains/characters/ui/character-detail.test.tsx` to assert the rendered shell includes "Edit level".

Update `tests/e2e/character-creation.spec.ts` after the initial detail level assertion:

```ts
await page.getByRole("button", { name: "Edit level" }).click();
await page.getByLabel("Character level").fill("8");
await page.getByRole("button", { name: "Save level" }).click();
await expect(page.getByText("Level 8")).toBeVisible();
```

After returning to the list, assert the list item shows "Level 8". After reload and re-opening detail, assert "Level 8" persists.

- [ ] **Step 3: Run tests to verify red**

Run: `pnpm exec vitest run src/domains/characters/ui/character-detail.test.tsx`

Expected: fail because "Edit level" does not render.

- [ ] **Step 4: Implement UI**

In `src/domains/characters/ui/character-detail.tsx`, import Mantine form/modal/input components, `useMutation`, `useQueryClient`, `useState`, generated `apiMutations`, `apiQueryKeys`, and existing `validateCharacterLevel`.

Create a focused child component such as `CharacterLevelEditor` that:

```tsx
const form = useForm<{ level: number | string }>({
	mode: "controlled",
	initialValues: { level },
	validate: { level: validateCharacterLevel },
});
```

On submit, call:

```tsx
updateMutation.mutate({
	params: { characterId },
	body: { level: Number(values.level) },
});
```

On success, update `getCharacter` query data, invalidate `listCharacters`, close the modal, and reset the form to the returned level. Show a red alert when the mutation errors.

- [ ] **Step 5: Verify UI test green**

Run: `pnpm exec vitest run src/domains/characters/ui/character-detail.test.tsx`

Expected: pass.

- [ ] **Step 6: Commit**

Run: `git add src/generated/openapi.generated.json src/generated/api-client.generated.ts src/domains/characters/ui/character-detail.tsx src/domains/characters/ui/character-detail.test.tsx tests/e2e/character-creation.spec.ts && git commit -m "Add character level editing UI"`

### Task 4: Full Validation And PR Prep

**Files:**
- Modify if needed: `docs/quality.md`

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: locally validated branch ready to push and open a PR.

- [ ] **Step 1: Verify generated artifacts**

Run: `pnpm api:check`

Expected: pass without modifying generated files.

- [ ] **Step 2: Run full validation**

Run: `pnpm lint`

Expected: pass.

Run: `pnpm test`

Expected: pass unit, integration, and e2e suites.

Run: `pnpm check:docs`

Expected: pass.

- [ ] **Step 3: Update quality doc only if coverage changed materially**

If the character grade notes should mention level editing, update the `characters` row in `docs/quality.md` to include level editing coverage, then run `pnpm check:docs` again.

- [ ] **Step 4: Commit validation/documentation updates**

Run: `git status --short`

If `docs/quality.md` changed, run:

```bash
git add docs/quality.md
git commit -m "Update character quality notes"
```

- [ ] **Step 5: Publish and inspect PR**

Push branch:

```bash
git push -u origin agent/edit-character-level
```

Open a draft PR titled "Edit character levels" with a summary of API, UI, and tests. Inspect PR review/CI state and address actionable comments before marking ready for review.
