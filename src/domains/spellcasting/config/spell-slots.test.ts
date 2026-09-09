import { describe, expect, it } from "vitest";
import { type CharacterSpellSlot, SpellSlotUnavailableError } from "../types/index.js";
import { applySpellSlotChange, normalizeSpellSlotConfiguration } from "./spell-slots.js";

describe("normalizeSpellSlotConfiguration", () => {
	it("updates configured totals and clamps used slots when totals are lowered", () => {
		const previous = makeSlots([{ level: 1, total: 4, used: 3 }]);

		const result = normalizeSpellSlotConfiguration(previous, {
			slots: [{ level: 1, total: 2 }],
		});

		expect(result.next[0]).toEqual({ level: 1, total: 2, used: 2, remaining: 0 });
		expect(result.events).toEqual([
			{
				action: "configured",
				level: 1,
				previous: { level: 1, total: 4, used: 3, remaining: 1 },
				next: { level: 1, total: 2, used: 2, remaining: 0 },
				totalDelta: -2,
				usedDelta: -1,
			},
		]);
	});
});

describe("applySpellSlotChange", () => {
	it("uses and restores one slot while preserving configured totals", () => {
		const previous = makeSlots([{ level: 1, total: 2, used: 0 }]);
		const used = applySpellSlotChange(previous, { level: 1 }, "used");
		const restored = applySpellSlotChange(used.next, { level: 1 }, "restored");

		expect(used.next[0]).toEqual({ level: 1, total: 2, used: 1, remaining: 1 });
		expect(used.event).toMatchObject({ action: "used", usedDelta: 1 });
		expect(restored.next[0]).toEqual({ level: 1, total: 2, used: 0, remaining: 2 });
		expect(restored.event).toMatchObject({ action: "restored", usedDelta: -1 });
	});

	it("rejects usage when no slots remain", () => {
		const previous = makeSlots([{ level: 1, total: 1, used: 1 }]);

		expect(() => applySpellSlotChange(previous, { level: 1 }, "used")).toThrow(
			SpellSlotUnavailableError,
		);
	});
});

function makeSlots(
	overrides: Array<{ level: number; total: number; used: number }> = [],
): CharacterSpellSlot[] {
	return Array.from({ length: 9 }, (_, index) => {
		const level = index + 1;
		const override = overrides.find((slot) => slot.level === level);
		const total = override?.total ?? 0;
		const used = override?.used ?? 0;
		return { level, total, used, remaining: total - used };
	});
}
