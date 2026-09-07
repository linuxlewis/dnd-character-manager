import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	characterSpellSlotEventsTable,
	characterSpellSlotsTable,
	characterSpellsTable,
	charactersTable,
} from "./tables.js";

describe("character tables", () => {
	it("uses the expected table names for manual migrations", () => {
		expect(getTableName(charactersTable)).toBe("characters");
		expect(getTableName(characterSpellSlotsTable)).toBe("character_spell_slots");
		expect(getTableName(characterSpellSlotEventsTable)).toBe("character_spell_slot_events");
		expect(getTableName(characterSpellsTable)).toBe("character_spells");
	});
});
