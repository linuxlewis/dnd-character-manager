import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	characterHealthEventsTable,
	characterHealthTable,
	characterSpellSlotEventsTable,
	characterSpellSlotsTable,
	characterSpellsTable,
	charactersTable,
} from "./character-table.js";

describe("character tables", () => {
	it("uses the expected table names for manual migrations", () => {
		expect(getTableName(charactersTable)).toBe("characters");
		expect(getTableName(characterHealthTable)).toBe("character_health");
		expect(getTableName(characterHealthEventsTable)).toBe("character_health_events");
		expect(getTableName(characterSpellSlotsTable)).toBe("character_spell_slots");
		expect(getTableName(characterSpellSlotEventsTable)).toBe("character_spell_slot_events");
		expect(getTableName(characterSpellsTable)).toBe("character_spells");
	});
});
