import { getDb } from "@providers/database/index.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { InventoryScopeId } from "../types/index.js";
import { InventoryCharacterIdSchema, InventoryScopeIdSchema } from "../types/index.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";

const ScopeIdRowSchema = z.object({ id: InventoryScopeIdSchema }).strict();

export interface CharacterInventoryScopeRepository {
	findCharacterScopeId(characterId: string): Promise<InventoryScopeId | null>;
	ensureCharacterScopeId(characterId: string): Promise<InventoryScopeId>;
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

		async ensureCharacterScopeId(characterId) {
			const parsedCharacterId = InventoryCharacterIdSchema.parse(characterId);
			await getDb()
				.insert(inventoryScopesTable)
				.values({ characterId: parsedCharacterId })
				.onConflictDoNothing({ target: inventoryScopesTable.characterId });
			const scopeId = await this.findCharacterScopeId(parsedCharacterId);
			if (!scopeId) throw new Error("Character inventory scope could not be ensured.");
			return scopeId;
		},
	};
}
