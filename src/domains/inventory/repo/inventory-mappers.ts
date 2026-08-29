import { z } from "zod";
import type { CharacterTreasury, CurrencyBalance, InventoryScope } from "../types/index.js";
import {
	CharacterTreasurySchema,
	CurrencyBalanceSchema,
	getCurrencyTotalValue,
	InventoryCharacterIdSchema,
	InventoryScopeIdSchema,
	InventoryScopeSchema,
	PostgresNonNegativeIntegerSchema,
} from "../types/index.js";

const DatabaseDateSchema = z.union([z.date(), z.iso.datetime()]);

const InventoryScopeRowSchema = z
	.object({
		id: InventoryScopeIdSchema,
		characterId: InventoryCharacterIdSchema,
		createdAt: DatabaseDateSchema,
		updatedAt: DatabaseDateSchema,
	})
	.strict();

export const InventoryTreasuryDatabaseRowSchema = z
	.object({
		inventoryScopeId: InventoryScopeIdSchema,
		copper: PostgresNonNegativeIntegerSchema,
		silver: PostgresNonNegativeIntegerSchema,
		gold: PostgresNonNegativeIntegerSchema,
		platinum: PostgresNonNegativeIntegerSchema,
		createdAt: DatabaseDateSchema,
		updatedAt: DatabaseDateSchema,
	})
	.strict();

export const InventoryTreasuryRowSchema = z
	.object({
		inventoryScopeId: InventoryScopeIdSchema,
		copper: PostgresNonNegativeIntegerSchema,
		silver: PostgresNonNegativeIntegerSchema,
		gold: PostgresNonNegativeIntegerSchema,
		platinum: PostgresNonNegativeIntegerSchema,
		createdAt: z.iso.datetime(),
		updatedAt: z.iso.datetime(),
	})
	.strict();
export type InventoryTreasuryRow = z.infer<typeof InventoryTreasuryRowSchema>;

export function toInventoryScope(row: unknown): InventoryScope {
	const parsed = InventoryScopeRowSchema.parse(row);
	return InventoryScopeSchema.parse({
		id: parsed.id,
		characterId: parsed.characterId,
		partyId: null,
		createdAt: toIsoString(parsed.createdAt),
		updatedAt: toIsoString(parsed.updatedAt),
	});
}

export function toInventoryTreasury(row: unknown): InventoryTreasuryRow {
	const parsed = InventoryTreasuryDatabaseRowSchema.parse(row);
	return InventoryTreasuryRowSchema.parse({
		inventoryScopeId: parsed.inventoryScopeId,
		copper: parsed.copper,
		silver: parsed.silver,
		gold: parsed.gold,
		platinum: parsed.platinum,
		createdAt: toIsoString(parsed.createdAt),
		updatedAt: toIsoString(parsed.updatedAt),
	});
}

export function toCharacterTreasury(characterId: unknown, row: unknown): CharacterTreasury {
	const parsedCharacterId = InventoryCharacterIdSchema.parse(characterId);
	const treasury = toInventoryTreasury(row);
	const balances: CurrencyBalance = CurrencyBalanceSchema.parse({
		cp: treasury.copper,
		sp: treasury.silver,
		gp: treasury.gold,
		pp: treasury.platinum,
	});

	return CharacterTreasurySchema.parse({
		characterId: parsedCharacterId,
		balances,
		totalValue: getCurrencyTotalValue(balances),
	});
}

export function zeroCharacterTreasury(characterId: unknown): CharacterTreasury {
	const parsedCharacterId = InventoryCharacterIdSchema.parse(characterId);
	const balances = CurrencyBalanceSchema.parse({ cp: 0, sp: 0, gp: 0, pp: 0 });
	return CharacterTreasurySchema.parse({
		characterId: parsedCharacterId,
		balances,
		totalValue: getCurrencyTotalValue(balances),
	});
}

function toIsoString(value: Date | string) {
	return value instanceof Date ? value.toISOString() : value;
}
