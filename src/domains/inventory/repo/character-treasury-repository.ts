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

export interface CharacterTreasuryMutationOptions {
	expectedPrevious?: CurrencyBalance;
}

export class CharacterTreasuryPreconditionError extends Error {
	readonly expectedPrevious: CurrencyBalance;
	readonly actualPrevious: CurrencyBalance;

	constructor(expectedPrevious: CurrencyBalance, actualPrevious: CurrencyBalance) {
		super("The character treasury changed after the operation was previewed.");
		this.name = "CharacterTreasuryPreconditionError";
		this.expectedPrevious = CurrencyBalanceSchema.parse(expectedPrevious);
		this.actualPrevious = CurrencyBalanceSchema.parse(actualPrevious);
	}
}

export interface CharacterTreasuryRepository {
	findCharacterTreasury(characterId: string): Promise<CharacterTreasury>;
	mutateCharacterTreasury(
		characterId: string,
		mutation: CharacterTreasuryMutation,
		options?: CharacterTreasuryMutationOptions,
	): Promise<CharacterTreasury>;
}

export function createCharacterTreasuryRepository(): CharacterTreasuryRepository {
	return {
		async findCharacterTreasury(characterId) {
			const parsedCharacterId = InventoryCharacterIdSchema.parse(characterId);
			const [scopeRow] = await getDb()
				.select(scopeColumns())
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

		async mutateCharacterTreasury(characterId, mutation, options = {}) {
			const parsedCharacterId = InventoryCharacterIdSchema.parse(characterId);
			const expectedPrevious = options.expectedPrevious
				? CurrencyBalanceSchema.parse(options.expectedPrevious)
				: undefined;
			return getDb().transaction(async (tx) => {
				await tx
					.insert(inventoryScopesTable)
					.values({ characterId: parsedCharacterId })
					.onConflictDoNothing({ target: inventoryScopesTable.characterId });

				const [scopeRow] = await tx
					.select(scopeColumns())
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
				if (
					expectedPrevious &&
					!currencyBalancesEqual(expectedPrevious, currentTreasury.balances)
				) {
					throw new CharacterTreasuryPreconditionError(expectedPrevious, currentTreasury.balances);
				}
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

function currencyBalancesEqual(left: CurrencyBalance, right: CurrencyBalance) {
	return (
		left.cp === right.cp && left.sp === right.sp && left.gp === right.gp && left.pp === right.pp
	);
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

function scopeColumns() {
	return {
		id: inventoryScopesTable.id,
		characterId: inventoryScopesTable.characterId,
		createdAt: inventoryScopesTable.createdAt,
		updatedAt: inventoryScopesTable.updatedAt,
	};
}
