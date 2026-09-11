import { readFileSync } from "node:fs";
import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { ABILITY_KEYS, type CharacterAttributesUpdateRequest, SKILL_KEYS } from "../types/index.js";
import {
	CharacterAttributesMissingError,
	createCharacterAttributesRepository,
} from "./character-attributes-repository.js";
import { createCharacterRepository } from "./character-repository.js";
import {
	characterAttributesTable,
	characterProficienciesTable,
	charactersTable,
} from "./character-table.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
	await cleanupCreatedUsers();
});

afterEach(async () => {
	await cleanupCreatedUsers();
});

async function cleanupCreatedUsers() {
	if (createdUserIds.length === 0) return;
	try {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
	} finally {
		createdUserIds.length = 0;
	}
}

afterAll(async () => {
	await closeDb();
});

describe("character attributes persistence", () => {
	it("matches the migration shape and includes the existing-character backfill", async () => {
		const migration = readFileSync("migrations/0014_character_attributes.sql", "utf8");
		expect(migration).toContain("CREATE TABLE IF NOT EXISTS character_attributes");
		expect(migration).toContain("CREATE TABLE IF NOT EXISTS character_proficiencies");
		expect(migration).toContain("SELECT id, 10, 10, 10, 10, 10, 10");
		expect(migration).toContain("ON CONFLICT (character_id) DO NOTHING");

		const columns = await getDb().execute(sql`
			SELECT table_name, column_name, is_nullable, column_default
			FROM information_schema.columns
			WHERE table_name IN ('character_attributes', 'character_proficiencies')
			ORDER BY table_name, ordinal_position
		`);
		const columnByName = new Map(
			columns.map((row) => [`${row.table_name}.${row.column_name}`, row]),
		);
		for (const column of [
			"strength",
			"dexterity",
			"constitution",
			"intelligence",
			"wisdom",
			"charisma",
		]) {
			expect(columnByName.get(`character_attributes.${column}`)).toMatchObject({
				is_nullable: "NO",
				column_default: "10",
			});
		}
		for (const column of ["created_at", "updated_at"]) {
			expect(columnByName.get(`character_attributes.${column}`)).toMatchObject({
				is_nullable: "NO",
				column_default: expect.stringContaining("now"),
			});
			expect(columnByName.get(`character_proficiencies.${column}`)).toMatchObject({
				is_nullable: "NO",
				column_default: expect.stringContaining("now"),
			});
		}
	});

	it("creates and reads default scores with every omitted rank materialized as none", async () => {
		const { characterId, userId } = await createCharacter();
		const repository = createCharacterAttributesRepository();

		await expect(repository.findCharacterAttributes(userId, characterId)).resolves.toEqual({
			scores: defaultScores(),
			savingThrowProficiencies: ABILITY_KEYS.map((key) => ({ key, rank: "none" })),
			skillProficiencies: SKILL_KEYS.map((key) => ({ key, rank: "none" })),
		});
		expect(await countRows(characterAttributesTable, characterId)).toBe(1);
		expect(await countRows(characterProficienciesTable, characterId)).toBe(0);
	});

	it("replaces all scores atomically while storing only non-none ranks", async () => {
		const { characterId, userId } = await createCharacter();
		const repository = createCharacterAttributesRepository();
		const input = {
			scores: { ...defaultScores(), dexterity: 16, wisdom: 14 },
			savingThrowProficiencies: ABILITY_KEYS.map((key) => ({
				key,
				rank: key === "wisdom" ? ("proficient" as const) : ("none" as const),
			})),
			skillProficiencies: SKILL_KEYS.map((key) => ({
				key,
				rank:
					key === "stealth"
						? ("expertise" as const)
						: key === "perception"
							? ("proficient" as const)
							: ("none" as const),
			})),
		};

		await expect(
			repository.replaceCharacterAttributes(userId, characterId, input),
		).resolves.toEqual({
			scores: input.scores,
			savingThrowProficiencies: input.savingThrowProficiencies,
			skillProficiencies: input.skillProficiencies,
		});
		const rows = await getDb()
			.select({
				category: characterProficienciesTable.category,
				key: characterProficienciesTable.key,
				rank: characterProficienciesTable.rank,
			})
			.from(characterProficienciesTable)
			.where(eq(characterProficienciesTable.characterId, characterId));
		expect(rows).toEqual(
			expect.arrayContaining([
				{ category: "saving-throw", key: "wisdom", rank: "proficient" },
				{ category: "skill", key: "perception", rank: "proficient" },
				{ category: "skill", key: "stealth", rank: "expertise" },
			]),
		);
		expect(rows).toHaveLength(3);
	});

	it("rejects malformed input without changing the saved state", async () => {
		const { characterId, userId } = await createCharacter();
		const repository = createCharacterAttributesRepository();
		await expect(
			repository.replaceCharacterAttributes(userId, characterId, {
				scores: { ...defaultScores(), strength: 31 },
				savingThrowProficiencies: [],
				skillProficiencies: [],
			}),
		).rejects.toThrow();
		await expect(repository.findCharacterAttributes(userId, characterId)).resolves.toMatchObject({
			scores: defaultScores(),
		});
	});

	it("does not silently treat a missing attribute row as an empty state", async () => {
		const { characterId, userId } = await createCharacter();
		await getDb()
			.delete(characterAttributesTable)
			.where(eq(characterAttributesTable.characterId, characterId));
		const repository = createCharacterAttributesRepository();
		await expect(repository.findCharacterAttributes(userId, characterId)).rejects.toBeInstanceOf(
			CharacterAttributesMissingError,
		);
		await expect(
			repository.replaceCharacterAttributes(userId, characterId, validInput()),
		).rejects.toBeInstanceOf(CharacterAttributesMissingError);
	});

	it("isolates ownership and cascades attribute records with the character", async () => {
		const { characterId, userId } = await createCharacter();
		const otherUserId = await createUser();
		const repository = createCharacterAttributesRepository();
		await expect(repository.findCharacterAttributes(otherUserId, characterId)).resolves.toBeNull();
		await expect(
			repository.replaceCharacterAttributes(otherUserId, characterId, validInput()),
		).resolves.toBeNull();

		await repository.replaceCharacterAttributes(
			userId,
			characterId,
			validInput({ skill: "athletics", rank: "proficient" }),
		);
		expect(await countRows(characterAttributesTable, characterId)).toBe(1);
		expect(await countRows(characterProficienciesTable, characterId)).toBe(1);

		await getDb().delete(charactersTable).where(eq(charactersTable.id, characterId));
		expect(await countRows(characterAttributesTable, characterId)).toBe(0);
		expect(await countRows(characterProficienciesTable, characterId)).toBe(0);
	});

	it("serializes concurrent replacements without mixing their states", async () => {
		const { characterId, userId } = await createCharacter();
		const repository = createCharacterAttributesRepository();
		const first = validInput({ strength: 18, skill: "athletics", rank: "proficient" });
		const second = validInput({ strength: 8, skill: "stealth", rank: "expertise" });
		await Promise.all([
			repository.replaceCharacterAttributes(userId, characterId, first),
			repository.replaceCharacterAttributes(userId, characterId, second),
		]);

		const finalState = await repository.findCharacterAttributes(userId, characterId);
		expect(finalState).toBeDefined();
		const matchesFirst = finalState?.scores.strength === 18;
		expect(finalState?.scores.strength).toBe(matchesFirst ? 18 : 8);
		expect(finalState?.skillProficiencies.find((entry) => entry.key === "athletics")?.rank).toBe(
			matchesFirst ? "proficient" : "none",
		);
		expect(finalState?.skillProficiencies.find((entry) => entry.key === "stealth")?.rank).toBe(
			matchesFirst ? "none" : "expertise",
		);
	});
});

function defaultScores() {
	return {
		strength: 10,
		dexterity: 10,
		constitution: 10,
		intelligence: 10,
		wisdom: 10,
		charisma: 10,
	};
}

function validInput(
	overrides: { strength?: number; skill?: string; rank?: "half" | "proficient" | "expertise" } = {},
): CharacterAttributesUpdateRequest {
	return {
		scores: { ...defaultScores(), strength: overrides.strength ?? 10 },
		savingThrowProficiencies: ABILITY_KEYS.map((key) => ({ key, rank: "none" as const })),
		skillProficiencies: SKILL_KEYS.map((key) => ({
			key,
			rank: key === overrides.skill ? (overrides.rank ?? "none") : "none",
		})),
	};
}

async function createCharacter() {
	const userId = await createUser();
	const character = await createCharacterRepository().createCharacter({
		userId,
		name: "Mira",
		className: "Fighter",
		level: 1,
		maxHp: 10,
	});
	return { userId, characterId: character.id };
}

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

async function countRows(
	table: typeof characterAttributesTable | typeof characterProficienciesTable,
	characterId: string,
) {
	const rows = await getDb()
		.select({ characterId: table.characterId })
		.from(table)
		.where(eq(table.characterId, characterId));
	return rows.length;
}
