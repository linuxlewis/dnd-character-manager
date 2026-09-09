import { describe, expect, it } from "vitest";
import { UpdateCharacterHealthRequestSchema } from "./index.js";

describe("UpdateCharacterHealthRequestSchema", () => {
	it("allows editable current, max, and temporary HP values", () => {
		expect(
			UpdateCharacterHealthRequestSchema.parse({
				currentHp: 18,
				maxHp: 20,
				temporaryHp: 5,
			}),
		).toEqual({
			currentHp: 18,
			maxHp: 20,
			temporaryHp: 5,
		});
	});

	it("rejects negative HP and zero max HP", () => {
		expect(() =>
			UpdateCharacterHealthRequestSchema.parse({
				currentHp: -1,
				maxHp: 0,
				temporaryHp: 0,
			}),
		).toThrow();
	});
});
