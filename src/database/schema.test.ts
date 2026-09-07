import { getTableName, is, Relations, Table } from "drizzle-orm";
import { expect, it } from "vitest";
import * as schema from "./schema.js";

it("registers each physical table and relation configuration once", () => {
	const tables = Object.values(schema).filter((value) => is(value, Table));
	expect(tables).toHaveLength(17);
	expect(new Set(tables).size).toBe(17);
	expect(tables.map(getTableName).sort()).toEqual([
		"account",
		"catalogue_item_seed_audits",
		"catalogue_items",
		"catalogue_spells",
		"character_health",
		"character_health_events",
		"character_spell_slot_events",
		"character_spell_slots",
		"character_spells",
		"characters",
		"inventory_history_entries",
		"inventory_items",
		"inventory_scopes",
		"inventory_treasuries",
		"session",
		"user",
		"verification",
	]);
	expect(schema).not.toHaveProperty("characterTable");
	expect(schema).not.toHaveProperty("authTables");
	const configurations = Object.values(schema).filter((value) => is(value, Relations));
	expect(new Set(configurations.map((value) => value.table)).size).toBe(configurations.length);
	for (const configuration of configurations) expect(tables).toContain(configuration.table);
});
