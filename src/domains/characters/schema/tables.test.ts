import { getTableName } from "drizzle-orm";
import { expect, it } from "vitest";
import { charactersTable } from "./tables.js";

it("retains the identity table mapping", () => {
	expect(getTableName(charactersTable)).toBe("characters");
});
