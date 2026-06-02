import { describe, expect, it } from "vitest";
import { characterFromRow } from "./character-row.js";

const row = {
	id: "00000000-0000-4000-8000-000000000000",
	userId: "00000000-0000-4000-8000-000000000001",
	name: "Astra",
	characterClass: "Cleric",
	level: 4,
	createdAt: new Date("2026-05-31T12:00:00.000Z"),
	updatedAt: new Date("2026-05-31T12:00:00.000Z"),
};

describe("characterFromRow", () => {
	it("maps parsed database rows to domain characters", () => {
		expect(characterFromRow(row)).toEqual({
			id: row.id,
			userId: row.userId,
			name: "Astra",
			class: "Cleric",
			level: 4,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	});

	it("rejects rows that do not match character constraints", () => {
		expect(() => characterFromRow({ ...row, characterClass: "Commoner" })).toThrow();
	});
});
