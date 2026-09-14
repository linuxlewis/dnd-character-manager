import { describe, expect, it } from "vitest";
import { DndApiSpellClientError } from "./dnd-api-spell-client.js";

describe("DndApiSpellClient", () => {
	it("provides the character-facing unavailable error", () => {
		expect(new DndApiSpellClientError().message).toBe("D&D spells could not be loaded.");
	});
});
