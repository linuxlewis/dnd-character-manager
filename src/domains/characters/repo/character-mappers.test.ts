import { describe, expect, it } from "vitest";
import {
	toCharacterDetail,
	toCharacterHealth,
	toCharacterSpell,
	toHealthChange,
	toSpellSlotChange,
	toSpellSlotState,
} from "./character-mappers.js";

describe("toCharacterDetail", () => {
	it("maps stored character experience into detail progress", () => {
		expect(
			toCharacterDetail(
				{
					id: "00000000-0000-4000-8000-000000000001",
					name: "Mira",
					className: "Fighter",
					level: 7,
					experiencePoints: 27_000,
					currentHp: 28,
					maxHp: 28,
					temporaryHp: 0,
				},
				[],
			),
		).toMatchObject({
			id: "00000000-0000-4000-8000-000000000001",
			level: 7,
			experiencePoints: 27_000,
			experience: {
				nextLevel: 8,
				progressPercent: 36,
				experienceRemaining: 7_000,
			},
		});
	});
});

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
