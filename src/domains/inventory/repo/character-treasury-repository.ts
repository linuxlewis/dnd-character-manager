import { getDb } from "@providers/database/index.js";
import { eq } from "drizzle-orm";
import type { CharacterTreasury, CurrencyBalance } from "../types/index.js";
import { CurrencyBalanceSchema, InventoryCharacterIdSchema } from "../types/index.js";
import {
	toCharacterTreasury,
	toInventoryScope,
	zeroCharacterTreasury,
} from "./inventory-mappers.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";
import { inventoryTreasuriesTable } from "./inventory-treasury-table.js";

export type CharacterTreasuryMutation = (current: CurrencyBalance) => CurrencyBalance;

export interface CharacterTreasuryRepository {
	findCharacterTreasury(characterId: string): Promise<CharacterTreasury>;
	mutateCharacterTreasury(
		characterId: string,
		mutation: CharacterTreasuryMutation,
	): Promise<CharacterTreasury>;
}

export function createCharacterTreasuryRepository(): CharacterTreasuryRepository {
	return {
		async findCharacterTreasury(characterId) {
			const parsedCharacterId = InventoryCharacterIdSchema.parse(characterId);
			const [scopeRow] = await getDb()
				.select({
					id: inventoryScopesTable.id,
					characterId: inventoryScopesTable.characterId,
					createdAt: inventoryScopesTable.createdAt,
					updatedAt: inventoryScopesTable.updatedAt,
				})
				.from(inventoryScopesTable)
				.where(eq(inventoryScopesTable.characterId, parsedCharacterId))
				.limit(1);

			if (!scopeRow) return zeroCharacterTreasury(parsedCharacterId);

			const scope = toInventoryScope(scopeRow);
			const [treasuryRow] = await getDb()
				.select(treasuryColumns())
				.from(inventoryTreasuriesTable)
				.where(eq(inventoryTreasuriesTable.inventoryScopeId, scope.id))
				.limit(1);

			return treasuryRow
				? toCharacterTreasury(parsedCharacterId, treasuryRow)
				: zeroCharacterTreasury(parsedCharacterId);
		},

		async mutateCharacterTreasury(characterId, mutation) {
			const parsedCharacterId = InventoryCharacterIdSchema.parse(characterId);
			return getDb().transaction(async (tx) => {
				await tx
					.insert(inventoryScopesTable)
					.values({ characterId: parsedCharacterId })
					.onConflictDoNothing({ target: inventoryScopesTable.characterId });

				const [scopeRow] = await tx
					.select({
						id: inventoryScopesTable.id,
						characterId: inventoryScopesTable.characterId,
						createdAt: inventoryScopesTable.createdAt,
						updatedAt: inventoryScopesTable.updatedAt,
					})
					.from(inventoryScopesTable)
					.where(eq(inventoryScopesTable.characterId, parsedCharacterId))
					.limit(1);

				if (!scopeRow) throw new Error("Inventory scope could not be ensured.");
				const scope = toInventoryScope(scopeRow);

				await tx
					.insert(inventoryTreasuriesTable)
					.values({ inventoryScopeId: scope.id })
					.onConflictDoNothing({ target: inventoryTreasuriesTable.inventoryScopeId });

				const [treasuryRow] = await tx
					.select(treasuryColumns())
					.from(inventoryTreasuriesTable)
					.where(eq(inventoryTreasuriesTable.inventoryScopeId, scope.id))
					.limit(1)
					.for("update");

				if (!treasuryRow) throw new Error("Inventory treasury could not be ensured.");
				const currentTreasury = toCharacterTreasury(parsedCharacterId, treasuryRow);
				const nextBalances = CurrencyBalanceSchema.parse(mutation(currentTreasury.balances));

				const [updatedTreasuryRow] = await tx
					.update(inventoryTreasuriesTable)
					.set({
						copper: nextBalances.cp,
						silver: nextBalances.sp,
						gold: nextBalances.gp,
						platinum: nextBalances.pp,
						updatedAt: new Date(),
					})
					.where(eq(inventoryTreasuriesTable.inventoryScopeId, scope.id))
					.returning(treasuryColumns());

				if (!updatedTreasuryRow) throw new Error("Inventory treasury could not be updated.");
				return toCharacterTreasury(parsedCharacterId, updatedTreasuryRow);
			});
		},
	};
}

function treasuryColumns() {
	return {
		inventoryScopeId: inventoryTreasuriesTable.inventoryScopeId,
		copper: inventoryTreasuriesTable.copper,
		silver: inventoryTreasuriesTable.silver,
		gold: inventoryTreasuriesTable.gold,
		platinum: inventoryTreasuriesTable.platinum,
		createdAt: inventoryTreasuriesTable.createdAt,
		updatedAt: inventoryTreasuriesTable.updatedAt,
	};
}
