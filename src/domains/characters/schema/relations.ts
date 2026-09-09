import { relations } from "drizzle-orm";
import {
	characterSpellSlotEventsTable,
	characterSpellSlotsTable,
	characterSpellsTable,
	charactersTable,
} from "./tables.js";

export const characterSpellSlotsRelations = relations(characterSpellSlotsTable, ({ one }) => ({
	character: one(charactersTable, {
		fields: [characterSpellSlotsTable.characterId],
		references: [charactersTable.id],
	}),
}));

export const characterSpellSlotEventsRelations = relations(
	characterSpellSlotEventsTable,
	({ one }) => ({
		character: one(charactersTable, {
			fields: [characterSpellSlotEventsTable.characterId],
			references: [charactersTable.id],
		}),
	}),
);

export const characterSpellsRelations = relations(characterSpellsTable, ({ one }) => ({
	character: one(charactersTable, {
		fields: [characterSpellsTable.characterId],
		references: [charactersTable.id],
	}),
}));
