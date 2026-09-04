import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { ABILITY_KEYS, type CharacterAttributesUpdateRequest, SKILL_KEYS } from "../types/index.js";
import { createCharacterAttributesRepository } from "./character-attributes-repository.js";
import {
	withTransactionFailure,
	withTransactionObserver,
} from "./character-attributes-repository-test-helpers.js";
import { createCharacterRepository } from "./character-repository.js";

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

describe("character attributes repository boundaries", () => {
	it("uses the supplied database for replacement transactions", async () => {
		const { characterId, userId } = await createCharacter();
		const transactionConfigs: unknown[] = [];
		const repository = createCharacterAttributesRepository(
			withTransactionObserver(getDb(), (config) => transactionConfigs.push(config)),
		);

		await expect(
			repository.replaceCharacterAttributes(userId, characterId, validInput()),
		).resolves.toBeDefined();
		expect(transactionConfigs).toHaveLength(1);
	});

	it("uses the exact repeatable-read, read-only transaction options", async () => {
		const { characterId, userId } = await createCharacter();
		const transactionConfigs: unknown[] = [];
		const repository = createCharacterAttributesRepository(
			withTransactionObserver(getDb(), (config) => transactionConfigs.push(config)),
		);

		await expect(repository.findCharacterAttributes(userId, characterId)).resolves.toBeDefined();
		expect(transactionConfigs).toEqual([
			{ isolationLevel: "repeatable read", accessMode: "read only" },
		]);
	});

	it("rolls back a replacement that fails after changing both child tables", async () => {
		const { characterId, userId } = await createCharacter();
		const repository = createCharacterAttributesRepository();
		const priorState = await repository.replaceCharacterAttributes(
			userId,
			characterId,
			validInput({ strength: 18, skill: "athletics", rank: "proficient" }),
		);
		if (!priorState) throw new Error("Initial replacement did not return a state.");

		const failingRepository = createCharacterAttributesRepository(
			withTransactionFailure(getDb(), "insert"),
		);
		await expect(
			failingRepository.replaceCharacterAttributes(
				userId,
				characterId,
				validInput({ strength: 8, skill: "stealth", rank: "expertise" }),
			),
		).rejects.toThrow("Injected transaction failure");

		await expect(repository.findCharacterAttributes(userId, characterId)).resolves.toEqual(
			priorState,
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
