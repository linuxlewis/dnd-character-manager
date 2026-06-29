import { describe, expect, it } from "vitest";
import { toCharacterHealth, toHealthChange } from "./character-mappers.js";

describe("toCharacterHealth", () => {
	it("derives effective max HP from base and temporary HP", () => {
		expect(toCharacterHealth({ currentHp: 18, maxHp: 20, temporaryHp: 5 })).toEqual({
			currentHp: 18,
			maxHp: 20,
			temporaryHp: 5,
			effectiveMaxHp: 25,
		});
	});
});

describe("toHealthChange", () => {
	it("maps stored row diffs into a response event", () => {
		expect(
			toHealthChange({
				id: "00000000-0000-4000-8000-000000000001",
				previousCurrentHp: 12,
				nextCurrentHp: 17,
				previousMaxHp: 20,
				nextMaxHp: 20,
				previousTemporaryHp: 0,
				nextTemporaryHp: 5,
				currentHpDelta: 5,
				maxHpDelta: 0,
				temporaryHpDelta: 5,
				createdAt: new Date("2026-06-01T12:00:00.000Z"),
			}),
		).toEqual({
			id: "00000000-0000-4000-8000-000000000001",
			previous: {
				currentHp: 12,
				maxHp: 20,
				temporaryHp: 0,
				effectiveMaxHp: 20,
			},
			next: {
				currentHp: 17,
				maxHp: 20,
				temporaryHp: 5,
				effectiveMaxHp: 25,
			},
			currentHpDelta: 5,
			maxHpDelta: 0,
			temporaryHpDelta: 5,
			createdAt: "2026-06-01T12:00:00.000Z",
		});
	});
});
