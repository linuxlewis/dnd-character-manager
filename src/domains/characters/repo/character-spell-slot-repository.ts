import { getDb } from "@providers/database/index.js";
import { and, desc, eq } from "drizzle-orm";
import type {
	CharacterClass,
	CharacterSpellSlot,
	CharacterSpellSlotsResponse,
	SpellSlotAction,
	SpellSlotChangeResponse,
} from "../types/index.js";
import { CharacterSpellSlotsResponseSchema } from "../types/index.js";
import { toSpellSlotChange, toSpellSlotState } from "./character-mappers.js";
import {
	characterSpellSlotEventsTable,
	characterSpellSlotsTable,
	charactersTable,
} from "./character-table.js";

export interface CharacterSpellSlotContext {
	className: CharacterClass;
	level: number;
}

export interface NewSpellSlotChange {
	action: SpellSlotAction;
	level: number;
	previous: CharacterSpellSlot;
	next: CharacterSpellSlot;
	totalDelta: number;
	usedDelta: number;
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
	saveCharacterSpellSlots(
		userId: string,
		characterId: string,
		slots: CharacterSpellSlot[],
		changes: NewSpellSlotChange[],
	): Promise<CharacterSpellSlotsResponse | null>;
	listRecentSpellSlotChanges(characterId: string): Promise<SpellSlotChangeResponse[]>;
}

export function createCharacterSpellSlotRepository(): CharacterSpellSlotRepository {
	return {
		async findCharacterSpellSlotContext(userId, characterId) {
			const [row] = await getDb()
				.select({
					className: charactersTable.className,
					level: charactersTable.level,
				})
				.from(charactersTable)
				.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
				.limit(1);

			return row ?? null;
		},

		async findCharacterSpellSlots(userId, characterId) {
			const context = await this.findCharacterSpellSlotContext(userId, characterId);
			if (!context) return null;

			const rows = await getDb()
				.select(spellSlotColumns())
				.from(characterSpellSlotsTable)
				.where(eq(characterSpellSlotsTable.characterId, characterId));

			return mergeWithEmptySlots(rows.map(toSpellSlotState));
		},

		async saveCharacterSpellSlots(userId, characterId, slots, changes) {
			return getDb().transaction(async (tx) => {
				const [owned] = await tx
					.select({ id: charactersTable.id })
					.from(charactersTable)
					.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
					.limit(1);

				if (!owned) return null;

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

				if (changes.length > 0) {
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
			const rows = await getDb()
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
