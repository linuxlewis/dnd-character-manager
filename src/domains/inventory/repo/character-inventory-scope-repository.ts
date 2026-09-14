import { type DatabaseTransaction, getDb } from "@providers/database/index.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { lockOwnedCharacter } from "../../characters/access/index.js";
import { inventoryScopesTable } from "../schema/index.js";
import type { InventoryScopeId } from "../types/index.js";
import {
	InventoryCharacterIdSchema,
	InventoryHistoryActorUserIdSchema,
	InventoryScopeIdSchema,
} from "../types/index.js";

const ScopeIdRowSchema = z.object({ id: InventoryScopeIdSchema }).strict();

export interface CharacterInventoryOwner {
	userId: string;
	characterId: string;
}

export class CharacterInventoryAccessError extends Error {
	constructor() {
		super("Character inventory is not owned by this user.");
		this.name = "CharacterInventoryAccessError";
	}
}

export async function lockCharacterInventory(
	owner: CharacterInventoryOwner,
	tx: DatabaseTransaction,
) {
	const characterId = InventoryCharacterIdSchema.parse(owner.characterId);
	const userId = InventoryHistoryActorUserIdSchema.parse(owner.userId);
	if (!(await lockOwnedCharacter(userId, characterId, tx)))
		throw new CharacterInventoryAccessError();
	return { characterId, userId };
}

export async function lockCharacterInventoryScope(
	owner: CharacterInventoryOwner,
	tx: DatabaseTransaction,
) {
	const { characterId } = await lockCharacterInventory(owner, tx);
	const [row] = await tx
		.select({ id: inventoryScopesTable.id })
		.from(inventoryScopesTable)
		.where(eq(inventoryScopesTable.characterId, characterId))
		.limit(1);
	return row ? ScopeIdRowSchema.parse(row).id : null;
}

export interface CharacterInventoryScopeRepository {
	findCharacterScopeId(characterId: string): Promise<InventoryScopeId | null>;
}

export function createCharacterInventoryScopeRepository(): CharacterInventoryScopeRepository {
	return {
		async findCharacterScopeId(characterId) {
			const parsedCharacterId = InventoryCharacterIdSchema.parse(characterId);
			const [row] = await getDb()
				.select({ id: inventoryScopesTable.id })
				.from(inventoryScopesTable)
				.where(eq(inventoryScopesTable.characterId, parsedCharacterId))
				.limit(1);
			return row ? ScopeIdRowSchema.parse(row).id : null;
		},
	};
}
