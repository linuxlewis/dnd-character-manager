import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	characterHealthEventsTable,
	characterHealthTable,
	charactersTable,
} from "./character-table.js";

describe("character tables", () => {
	it("uses the expected table names for manual migrations", () => {
		expect(getTableName(charactersTable)).toBe("characters");
		expect(getTableName(characterHealthTable)).toBe("character_health");
		expect(getTableName(characterHealthEventsTable)).toBe("character_health_events");
	});
});
