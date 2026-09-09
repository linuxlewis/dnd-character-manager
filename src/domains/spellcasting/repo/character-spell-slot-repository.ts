import { type Database, type DatabaseTransaction, getDb } from "@providers/database/index.js";
import { desc, eq } from "drizzle-orm";
import { findOwnedCharacter, lockOwnedCharacter } from "../../characters/access/index.js";
import { applySpellSlotChange, normalizeSpellSlotConfiguration } from "../config/index.js";
import { characterSpellSlotEventsTable, characterSpellSlotsTable } from "../schema/index.js";
import type {
	CharacterSpellSlot,
	CharacterSpellSlotConfiguration,
	CharacterSpellSlotContext,
	CharacterSpellSlotsResponse,
	NewSpellSlotChange,
	SpellSlotChangeResponse,
	UpdateCharacterSpellSlotsRequest,
	UseCharacterSpellSlotRequest,
} from "../types/index.js";
import { CharacterSpellSlotsResponseSchema } from "../types/index.js";
import { toSpellSlotChange, toSpellSlotState } from "./character-mappers.js";

export type SpellSlotMutation =
	| { action: "configured"; input: UpdateCharacterSpellSlotsRequest }
	| { action: "used" | "restored"; input: UseCharacterSpellSlotRequest }
	| {
			action: "defaults-applied";
			input: { slots: CharacterSpellSlotConfiguration[] };
			context: CharacterSpellSlotContext;
	  };
export interface StaleSpellSlotContext {
	status: "stale-context";
	context: CharacterSpellSlotContext;
}
export interface CharacterSpellSlotRepository {
	findCharacterSpellSlotContext(
		userId: string,
		characterId: string,
	): Promise<CharacterSpellSlotContext | null>;
	findCharacterSpellSlots(
		userId: string,
		characterId: string,
	): Promise<CharacterSpellSlot[] | null>;
	mutateCharacterSpellSlots(
		userId: string,
		characterId: string,
		mutation: SpellSlotMutation,
	): Promise<CharacterSpellSlotsResponse | StaleSpellSlotContext | null>;
	listRecentSpellSlotChanges(characterId: string): Promise<SpellSlotChangeResponse[]>;
}

export function createCharacterSpellSlotRepository(
	database: () => Database = getDb,
	writeChanges = insertSpellSlotChanges,
): CharacterSpellSlotRepository {
	return {
		async findCharacterSpellSlotContext(userId, characterId) {
			const identity = await findOwnedCharacter(userId, characterId, database());
			return identity ? { className: identity.className, level: identity.level } : null;
		},

		async findCharacterSpellSlots(userId, characterId) {
			const context = await this.findCharacterSpellSlotContext(userId, characterId);
			if (!context) return null;

			const rows = await database()
				.select(spellSlotColumns())
				.from(characterSpellSlotsTable)
				.where(eq(characterSpellSlotsTable.characterId, characterId));

			return mergeWithEmptySlots(rows.map(toSpellSlotState));
		},

		async mutateCharacterSpellSlots(userId, characterId, mutation) {
			return database().transaction(async (tx) => {
				const owned = await lockOwnedCharacter(userId, characterId, tx);
				if (!owned) return null;
				if (
					mutation.action === "defaults-applied" &&
					(owned.className !== mutation.context.className || owned.level !== mutation.context.level)
				)
					return {
						status: "stale-context" as const,
						context: { className: owned.className, level: owned.level },
					};
				const rows = await tx
					.select(spellSlotColumns())
					.from(characterSpellSlotsTable)
					.where(eq(characterSpellSlotsTable.characterId, characterId));
				const previous = mergeWithEmptySlots(rows.map(toSpellSlotState));
				const update =
					mutation.action === "configured" || mutation.action === "defaults-applied"
						? normalizeSpellSlotConfiguration(previous, mutation.input, mutation.action)
						: (() => {
								const change = applySpellSlotChange(previous, mutation.input, mutation.action);
								return { next: change.next, events: [change.event] };
							})();
				const slots = update.next;
				const changes = update.events;

				await tx
					.delete(characterSpellSlotsTable)
					.where(eq(characterSpellSlotsTable.characterId, characterId));

				if (slots.length > 0) {
					await tx.insert(characterSpellSlotsTable).values(
						slots.map((slot) => ({
							characterId,
							spellLevel: slot.level,
							totalSlots: slot.total,
							usedSlots: slot.used,
						})),
					);
				}

				if (changes.length > 0) await writeChanges(tx, characterId, changes);

				const eventRows = await tx
					.select(spellSlotChangeColumns())
					.from(characterSpellSlotEventsTable)
					.where(eq(characterSpellSlotEventsTable.characterId, characterId))
					.orderBy(desc(characterSpellSlotEventsTable.createdAt))
					.limit(5);

				return CharacterSpellSlotsResponseSchema.parse({
					spellSlots: slots,
					recentSpellSlotChanges: eventRows.map(toSpellSlotChange),
				});
			});
		},

		async listRecentSpellSlotChanges(characterId) {
			const rows = await database()
				.select(spellSlotChangeColumns())
				.from(characterSpellSlotEventsTable)
				.where(eq(characterSpellSlotEventsTable.characterId, characterId))
				.orderBy(desc(characterSpellSlotEventsTable.createdAt))
				.limit(5);

			return rows.map(toSpellSlotChange);
		},
	};
}

function mergeWithEmptySlots(savedSlots: CharacterSpellSlot[]) {
	const byLevel = new Map(savedSlots.map((slot) => [slot.level, slot]));
	return emptySpellSlots().map((slot) => byLevel.get(slot.level) ?? slot);
}

function emptySpellSlots(): CharacterSpellSlot[] {
	return Array.from({ length: 9 }, (_, index) => ({
		level: index + 1,
		total: 0,
		used: 0,
		remaining: 0,
	}));
}

function spellSlotColumns() {
	return {
		spellLevel: characterSpellSlotsTable.spellLevel,
		totalSlots: characterSpellSlotsTable.totalSlots,
		usedSlots: characterSpellSlotsTable.usedSlots,
	};
}

function spellSlotChangeColumns() {
	return {
		id: characterSpellSlotEventsTable.id,
		action: characterSpellSlotEventsTable.action,
		spellLevel: characterSpellSlotEventsTable.spellLevel,
		previousTotalSlots: characterSpellSlotEventsTable.previousTotalSlots,
		nextTotalSlots: characterSpellSlotEventsTable.nextTotalSlots,
		previousUsedSlots: characterSpellSlotEventsTable.previousUsedSlots,
		nextUsedSlots: characterSpellSlotEventsTable.nextUsedSlots,
		totalSlotsDelta: characterSpellSlotEventsTable.totalSlotsDelta,
		usedSlotsDelta: characterSpellSlotEventsTable.usedSlotsDelta,
		createdAt: characterSpellSlotEventsTable.createdAt,
	};
}

export async function insertSpellSlotChanges(
	tx: DatabaseTransaction,
	characterId: string,
	changes: NewSpellSlotChange[],
) {
	await tx.insert(characterSpellSlotEventsTable).values(
		changes.map((change) => ({
			characterId,
			action: change.action,
			spellLevel: change.level,
			previousTotalSlots: change.previous.total,
			nextTotalSlots: change.next.total,
			previousUsedSlots: change.previous.used,
			nextUsedSlots: change.next.used,
			totalSlotsDelta: change.totalDelta,
			usedSlotsDelta: change.usedDelta,
		})),
	);
}
