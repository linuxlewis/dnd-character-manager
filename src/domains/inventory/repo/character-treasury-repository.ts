import { getDb } from "@providers/database/index.js";
import { eq } from "drizzle-orm";
import type {
	CharacterTreasury,
	CurrencyAddRequest,
	CurrencyBalance,
	CurrencyNote,
	CurrencySpendRequest,
	InventoryHistoryEntryInput,
	InventoryScopeId,
} from "../types/index.js";
import {
	CurrencyBalanceSchema,
	CurrencyDeltaSchema,
	CurrencyNoteSchema,
	InventoryCharacterIdSchema,
	InventoryHistoryActorUserIdSchema,
} from "../types/index.js";
import { toInventoryHistoryInsert } from "./inventory-history-mappers.js";
import { inventoryHistoryEntriesTable } from "./inventory-history-table.js";
import {
	toCharacterTreasury,
	toInventoryScope,
	zeroCharacterTreasury,
} from "./inventory-mappers.js";
import { inventoryScopesTable } from "./inventory-scope-table.js";
import { inventoryTreasuriesTable } from "./inventory-treasury-table.js";

type DatabaseTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export type CharacterTreasuryMutation = (current: CurrencyBalance) => CurrencyBalance;

export type CharacterTreasuryHistoryInput =
	| {
			operation: "add";
			requested: CurrencyAddRequest;
			note: CurrencyNote;
			actorUserId: string | null;
	  }
	| {
			operation: "spend";
			requested: CurrencySpendRequest;
			note: CurrencyNote;
			actorUserId: string | null;
	  };

export interface CharacterTreasuryMutationOptions {
	expectedPrevious?: CurrencyBalance;
	history?: CharacterTreasuryHistoryInput;
}

export type CharacterTreasuryHistoryWriter = (
	tx: DatabaseTransaction,
	scopeId: InventoryScopeId,
	input: InventoryHistoryEntryInput,
) => Promise<void>;

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

export interface CharacterTreasuryRepositoryOptions {
	historyWriter?: CharacterTreasuryHistoryWriter;
}

export function createCharacterTreasuryRepository(
	options: CharacterTreasuryRepositoryOptions = {},
): CharacterTreasuryRepository {
	const historyWriter = options.historyWriter ?? appendTreasuryHistory;

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
				if (options.history && !currencyBalancesEqual(currentTreasury.balances, nextBalances)) {
					await historyWriter(
						tx,
						scope.id,
						toTreasuryHistoryInput(options.history, {
							previous: currentTreasury.balances,
							next: nextBalances,
						}),
					);
				}
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

function toTreasuryHistoryInput(
	history: CharacterTreasuryHistoryInput,
	balances: { previous: CurrencyBalance; next: CurrencyBalance },
): InventoryHistoryEntryInput {
	const previous = CurrencyBalanceSchema.parse(balances.previous);
	const next = CurrencyBalanceSchema.parse(balances.next);
	const delta = CurrencyDeltaSchema.parse({
		cp: next.cp - previous.cp,
		sp: next.sp - previous.sp,
		gp: next.gp - previous.gp,
		pp: next.pp - previous.pp,
	});
	const actorUserId = InventoryHistoryActorUserIdSchema.nullable().parse(history.actorUserId);
	const note = CurrencyNoteSchema.parse(history.note);

	const commonDetails = {
		version: 1 as const,
		previous,
		next,
		delta,
		note,
	};
	return {
		action: "currency_updated",
		entityType: "currency",
		entityId: null,
		entityName: null,
		actorUserId,
		details:
			history.operation === "add"
				? { ...commonDetails, operation: "add", requested: history.requested }
				: { ...commonDetails, operation: "spend", requested: history.requested },
	};
}

async function appendTreasuryHistory(
	tx: DatabaseTransaction,
	scopeId: InventoryScopeId,
	input: InventoryHistoryEntryInput,
) {
	const [row] = await tx
		.insert(inventoryHistoryEntriesTable)
		.values(toInventoryHistoryInsert(scopeId, input))
		.returning({ id: inventoryHistoryEntriesTable.id });
	if (!row) throw new Error("Inventory treasury history could not be created.");
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
