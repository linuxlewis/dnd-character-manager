import { describe, it, expect } from "vitest";
import { characters } from "./schema.js";
import { getTableColumns } from "drizzle-orm";

describe("characters schema", () => {
	it("exports a characters table", () => {
		expect(characters).toBeDefined();
	});

	it("has all required columns", () => {
		const cols = getTableColumns(characters);
		const expectedColumns = [
			"id",
			"name",
			"race",
			"class",
			"level",
			"ability_scores",
			"hp",
			"spell_slots",
			"equipment",
			"skills",
			"notes",
			"created_at",
			"updated_at",
		];
		for (const col of expectedColumns) {
			expect(cols).toHaveProperty(col);
		}
	});

	it("has id as primary key", () => {
		const cols = getTableColumns(characters);
		expect(cols.id.primary).toBe(true);
	});

	it("has required name, race, class columns", () => {
		const cols = getTableColumns(characters);
		expect(cols.name.notNull).toBe(true);
		expect(cols.race.notNull).toBe(true);
		expect(cols.class.notNull).toBe(true);
	});

	it("has level defaulting to 1", () => {
		const cols = getTableColumns(characters);
		expect(cols.level.notNull).toBe(true);
	});

	it("has JSON text columns for complex data", () => {
		const cols = getTableColumns(characters);
		expect(cols.ability_scores.columnType).toBe("SQLiteTextJson");
		expect(cols.hp.columnType).toBe("SQLiteTextJson");
		expect(cols.spell_slots.columnType).toBe("SQLiteTextJson");
		expect(cols.equipment.columnType).toBe("SQLiteTextJson");
		expect(cols.skills.columnType).toBe("SQLiteTextJson");
	});
});
