import { getDb } from "@providers/database/index.js";
import {
	createCharacterService,
	initializeCharacterHealth,
	initializeCharacterIdentity,
} from "../../../domains/characters/service/index.js";
import type { CreateCharacterRequest } from "../../../domains/characters/types/index.js";

export async function createCharacter(
	input: CreateCharacterRequest & { userId: string },
	initializeHealth = initializeCharacterHealth,
) {
	const characterId = await getDb().transaction(async (transaction) => {
		const id = await initializeCharacterIdentity(input.userId, input, transaction);
		await initializeHealth(id, input.maxHp, transaction);
		return id;
	});
	return createCharacterService().getCharacter(input.userId, characterId);
}
