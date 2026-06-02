import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { characterTable } from "./character-table.js";

describe("characterTable", () => {
	it("maps the character domain to the characters table", () => {
		expect(getTableName(characterTable)).toBe("characters");
		expect(characterTable.userId).toBeDefined();
		expect(characterTable.characterClass.name).toBe("class");
	});
});
