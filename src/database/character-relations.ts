import { relations } from "drizzle-orm";
import { charactersTable } from "../domains/characters/schema/index.js";
import {
	characterHealthEventsTable,
	characterHealthTable,
} from "../domains/health/schema/index.js";
import { inventoryScopesTable } from "../domains/inventory/schema/index.js";
import {
	characterSpellSlotEventsTable,
	characterSpellSlotsTable,
	characterSpellsTable,
} from "../domains/spellcasting/schema/index.js";
import { userTable } from "../providers/auth/schema.js";

export const characterRelations = relations(charactersTable, ({ one, many }) => ({
	owner: one(userTable, { fields: [charactersTable.userId], references: [userTable.id] }),
	health: one(characterHealthTable),
	healthEvents: many(characterHealthEventsTable),
	spellSlots: many(characterSpellSlotsTable),
	spellSlotEvents: many(characterSpellSlotEventsTable),
	spells: many(characterSpellsTable),
	inventoryScope: one(inventoryScopesTable),
}));
