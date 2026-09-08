import { describe, expect, it } from "vitest";
import { toCharacterSpell, toSpellSlotChange, toSpellSlotState } from "./character-mappers.js";

describe("toSpellSlotState", () => {
	it("derives remaining slots from total and used slot counts", () => {
		expect(toSpellSlotState({ spellLevel: 2, totalSlots: 3, usedSlots: 1 })).toEqual({
			level: 2,
			total: 3,
			used: 1,
			remaining: 2,
		});
	});
});

describe("toSpellSlotChange", () => {
	it("maps stored spell slot event rows into response history", () => {
		expect(
			toSpellSlotChange({
				id: "00000000-0000-4000-8000-000000000011",
				action: "used",
				spellLevel: 1,
				previousTotalSlots: 4,
				nextTotalSlots: 4,
				previousUsedSlots: 0,
				nextUsedSlots: 1,
				totalSlotsDelta: 0,
				usedSlotsDelta: 1,
				createdAt: new Date("2026-07-01T12:00:00.000Z"),
			}),
		).toEqual({
			id: "00000000-0000-4000-8000-000000000011",
			action: "used",
			level: 1,
			previous: { total: 4, used: 0, remaining: 4 },
			next: { total: 4, used: 1, remaining: 3 },
			totalDelta: 0,
			usedDelta: 1,
			createdAt: "2026-07-01T12:00:00.000Z",
		});
	});
});

describe("toCharacterSpell", () => {
	it("maps stored character spell rows into the response shape", () => {
		expect(
			toCharacterSpell({
				id: "00000000-0000-4000-8000-000000000030",
				slotLevel: 3,
				spellSource: "spell",
				spellIndex: "magic-missile",
				spellName: "Magic Missile",
				spellLevel: 1,
				spellUrl: "/api/2014/spells/magic-missile",
			}),
		).toEqual({
			id: "00000000-0000-4000-8000-000000000030",
			slotLevel: 3,
			spellIndex: "magic-missile",
			name: "Magic Missile",
			level: 1,
			url: "/api/2014/spells/magic-missile",
			source: "spell",
		});
	});
});
