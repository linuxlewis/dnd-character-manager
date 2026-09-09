import { expect, it } from "vitest";
import { toCharacterSummary } from "./character-mappers.js";

it("rejects invalid identity rows before returning a summary", () => {
	expect(() =>
		toCharacterSummary({ id: "invalid", name: "Mira", className: "Wizard", level: 1 }),
	).toThrow();
});
