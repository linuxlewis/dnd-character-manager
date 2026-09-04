import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { ABILITY_KEYS, SKILL_KEYS } from "../types/index.js";
import { createCharacterAttributesRepository } from "./character-attributes-repository.js";
import {
	createReadGate,
	releaseActiveReadGates,
	withReadGate,
} from "./character-attributes-repository-concurrency-helpers.js";
import { createCharacterRepository } from "./character-repository.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
	releaseActiveReadGates();
	await cleanupCreatedUsers();
});

afterEach(async () => {
	releaseActiveReadGates();
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
	releaseActiveReadGates();
	try {
		await closeDb();
	} finally {
		createdUserIds.length = 0;
	}
});

describe("character attributes read consistency", () => {
	it("does not mix scores and proficiencies across a committed replacement", async () => {
		const { characterId, userId } = await createCharacter();
		const repository = createCharacterAttributesRepository();
		const first = validInput({ strength: 18, skill: "athletics", rank: "proficient" });
		const second = validInput({ strength: 8, skill: "stealth", rank: "expertise" });
		await repository.replaceCharacterAttributes(userId, characterId, first);

		const gate = createReadGate(2);
		const read = createCharacterAttributesRepository(withReadGate(getDb(), gate));
		const readPromise = read.findCharacterAttributes(userId, characterId);
		try {
			await gate.reached;
			await repository.replaceCharacterAttributes(userId, characterId, second);
		} finally {
			gate.release();
		}

		await expect(readPromise).resolves.toEqual({
			level: 1,
			state: {
				scores: first.scores,
				savingThrowProficiencies: first.savingThrowProficiencies,
				skillProficiencies: first.skillProficiencies,
			},
		});
	});

	it("does not report missing attributes when the character is deleted mid-read", async () => {
		const { characterId, userId } = await createCharacter();
		const gate = createReadGate(1);
		const repository = createCharacterAttributesRepository(withReadGate(getDb(), gate));
		const readPromise = repository.findCharacterAttributes(userId, characterId);

		try {
			await gate.reached;
			await getDb().execute(sql`DELETE FROM characters WHERE id = ${characterId}`);
		} finally {
			gate.release();
		}

		await expect(readPromise).resolves.toMatchObject({ state: { scores: defaultScores() } });
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

function validInput(overrides: {
	strength: number;
	skill: string;
	rank: "proficient" | "expertise";
}) {
	return {
		scores: { ...defaultScores(), strength: overrides.strength },
		savingThrowProficiencies: ABILITY_KEYS.map((key) => ({ key, rank: "none" as const })),
		skillProficiencies: SKILL_KEYS.map((key) => ({
			key,
			rank: key === overrides.skill ? overrides.rank : ("none" as const),
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
