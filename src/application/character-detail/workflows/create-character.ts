import { getDb } from "@providers/database/index.js";
import {
	initializeCharacterAttributes,
	initializeCharacterIdentity,
} from "../../../domains/characters/service/index.js";
import { initializeCharacterHealth } from "../../../domains/health/service/index.js";
import { getCharacter } from "../query.js";

import type { CreateCharacterRequest } from "../types/index.js";

export async function createCharacter(
	input: CreateCharacterRequest & { userId: string },
	initializeHealth = initializeCharacterHealth,
	initializeAttributes = initializeCharacterAttributes,
) {
	const characterId = await getDb().transaction(async (transaction) => {
		const id = await initializeCharacterIdentity(input.userId, input, transaction);
		await initializeHealth(id, input.maxHp, transaction);
		await initializeAttributes(id, transaction);
		return id;
	});
	return getCharacter(input.userId, characterId);
}
