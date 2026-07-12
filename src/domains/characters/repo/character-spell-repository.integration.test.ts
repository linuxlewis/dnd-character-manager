import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createCharacterRepository } from "./character-repository.js";
import { createCharacterSpellRepository } from "./character-spell-repository.js";

const createdUserIds: string[] = [];

afterEach(async () => {
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
});

afterAll(async () => {
	await closeDb();
});

describe("createCharacterSpellRepository", () => {
	it("saves and lists owned character spells by slot level", async () => {
		const userId = await createUser();
		const character = await createCharacterRepository().createCharacter({
			userId,
			name: "Tamsin",
			className: "Wizard",
			level: 7,
			maxHp: 30,
		});
		const repository = createCharacterSpellRepository();

		await expect(repository.listCharacterSpells(userId, character.id)).resolves.toEqual([]);
		await expect(
			repository.listCharacterSpells(crypto.randomUUID(), character.id),
		).resolves.toBeNull();

		const saved = await repository.saveCharacterSpell(userId, character.id, {
			slotLevel: 3,
			source: "spell",
			spellIndex: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
		});

		expect(saved?.spells).toEqual([
			expect.objectContaining({
				slotLevel: 3,
				spellIndex: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
				source: "spell",
			}),
		]);
		const savedSpellId = saved?.spells[0]?.id;
		expect(savedSpellId).toBeDefined();
		if (!savedSpellId) throw new Error("Expected saved spell id");
		await expect(repository.getCharacterSpell(userId, character.id, savedSpellId)).resolves.toEqual(
			expect.objectContaining({ spellIndex: "magic-missile" }),
		);
		await expect(
			repository.getCharacterSpell(crypto.randomUUID(), character.id, savedSpellId),
		).resolves.toBeNull();

		await repository.saveCharacterSpell(userId, character.id, {
			slotLevel: 3,
			source: "spell",
			spellIndex: "acid-arrow",
			name: "Acid Arrow",
			level: 2,
			url: "/api/2014/spells/acid-arrow",
		});
		await repository.saveCharacterSpell(userId, character.id, {
			slotLevel: 3,
			source: "spell",
			spellIndex: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
		});

		await expect(repository.listCharacterSpells(userId, character.id)).resolves.toEqual([
			expect.objectContaining({ spellIndex: "magic-missile" }),
			expect.objectContaining({ spellIndex: "acid-arrow" }),
		]);
		await expect(
			repository.removeCharacterSpell(crypto.randomUUID(), character.id, savedSpellId),
		).resolves.toBeNull();
		await expect(
			repository.removeCharacterSpell(userId, character.id, savedSpellId),
		).resolves.toEqual({
			spells: [expect.objectContaining({ spellIndex: "acid-arrow" })],
		});
		await expect(
			repository.getCharacterSpell(userId, character.id, savedSpellId),
		).resolves.toBeNull();
	});

	it("persists high-level class features saved under a spell slot", async () => {
		const userId = await createUser();
		const character = await createCharacterRepository().createCharacter({
			userId,
			name: "Corren",
			className: "Paladin",
			level: 11,
			maxHp: 82,
		});
		const repository = createCharacterSpellRepository();

		const saved = await repository.saveCharacterSpell(userId, character.id, {
			slotLevel: 1,
			source: "feature",
			spellIndex: "improved-divine-smite",
			name: "Improved Divine Smite",
			level: 11,
			url: "/api/2014/features/improved-divine-smite",
		});

		expect(saved?.spells).toEqual([
			expect.objectContaining({
				slotLevel: 1,
				spellIndex: "improved-divine-smite",
				name: "Improved Divine Smite",
				level: 11,
				source: "feature",
			}),
		]);
	});
});

async function createUser() {
	const id = crypto.randomUUID();
	createdUserIds.push(id);
	await getDb()
		.insert(userTable)
		.values({
			id,
			name: "Test User",
			email: `${id}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	return id;
}
