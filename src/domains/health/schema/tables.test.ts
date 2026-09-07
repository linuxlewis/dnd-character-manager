import { getTableName } from "drizzle-orm";
import { expect, it } from "vitest";
import { characterHealthEventsTable, characterHealthTable } from "./tables.js";

it("retains deployed health table names", () => {
	expect(getTableName(characterHealthTable)).toBe("character_health");
	expect(getTableName(characterHealthEventsTable)).toBe("character_health_events");
});
