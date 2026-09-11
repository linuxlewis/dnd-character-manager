import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCharacterAttributesRepository } from "../repo/character-attributes-repository.js";
import { createCharacterRepository } from "../repo/character-repository.js";
import { ABILITY_KEYS, SKILL_KEYS } from "../types/index.js";
import { createCharacterAttributesService } from "./character-attributes-service.js";
import { createCharacterService } from "./character-service.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
	await cleanupCreatedUsers();
});

afterEach(async () => {
	await cleanupCreatedUsers();
});

afterAll(async () => {
	await closeDb();
});

describe("character attributes service consistency", () => {
	it.each([
		"get",
		"update",
	] as const)("uses one level and attributes snapshot when a level changes during %s authorization", async (operation) => {
		const userId = await createUser();
		const characterRepository = createCharacterRepository();
		const characterService = createCharacterService(characterRepository);
		const character = await characterService.createCharacter(userId, {
			name: "Mira",
			className: "Fighter",
			level: 1,
			maxHp: 10,
		});
		const attributesRepository = createCharacterAttributesRepository();
		await attributesRepository.replaceCharacterAttributes(
			userId,
			character.id,
			configuredAttributes(),
		);

		const barrier = createBarrier();
		const gatedCharacterService = {
			getCharacter: async (requestedUserId: string, requestedCharacterId: string) => {
				const authorized = await characterService.getCharacter(
					requestedUserId,
					requestedCharacterId,
				);
				barrier.reach();
				await barrier.releasePromise;
				return authorized;
			},
		};
		const service = createCharacterAttributesService({
			repository: attributesRepository,
			characterService: gatedCharacterService,
		});

		const responsePromise =
			operation === "get"
				? service.getCharacterAttributes(userId, character.id)
				: service.updateCharacterAttributes(userId, character.id, configuredAttributes());
		await barrier.reached;
		await characterService.updateCharacterLevel(userId, character.id, { level: 5 });
		barrier.release();

		const response = await responsePromise;
		expect(response.attributes.proficiencyBonus).toBe(3);
		expect(findRoll(response, "skill-stealth")).toMatchObject({ total: 9 });
	});
});

function createBarrier() {
	let resolveReached: () => void = () => undefined;
	let resolveRelease: () => void = () => undefined;
	const reached = new Promise<void>((resolve) => {
		resolveReached = resolve;
	});
	const releasePromise = new Promise<void>((resolve) => {
		resolveRelease = resolve;
	});
	return {
		reached,
		reach: resolveReached,
		release: resolveRelease,
		releasePromise,
	};
}

function defaultScores() {
	return {
		strength: 10,
		dexterity: 16,
		constitution: 10,
		intelligence: 10,
		wisdom: 10,
		charisma: 10,
	};
}

function configuredAttributes() {
	return {
		scores: defaultScores(),
		savingThrowProficiencies: ABILITY_KEYS.map((key) => ({ key, rank: "none" as const })),
		skillProficiencies: SKILL_KEYS.map((key) => ({
			key,
			rank: key === "stealth" ? ("expertise" as const) : ("none" as const),
		})),
	};
}

function findRoll(
	response: { attributes: { rollReference: Array<{ id: string; total: number }> } },
	id: string,
) {
	const roll = response.attributes.rollReference.find((entry) => entry.id === id);
	if (!roll) throw new Error(`Roll ${id} was not returned.`);
	return roll;
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
