import { relations } from "drizzle-orm";
import { charactersTable } from "../../characters/schema/index.js";
import { characterHealthEventsTable, characterHealthTable } from "./tables.js";
export const characterHealthRelations = relations(characterHealthTable, ({ one }) => ({
	character: one(charactersTable, {
		fields: [characterHealthTable.characterId],
		references: [charactersTable.id],
	}),
}));

export const characterHealthEventsRelations = relations(characterHealthEventsTable, ({ one }) => ({
	character: one(charactersTable, {
		fields: [characterHealthEventsTable.characterId],
		references: [charactersTable.id],
	}),
}));
