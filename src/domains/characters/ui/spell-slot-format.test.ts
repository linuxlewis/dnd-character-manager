import { describe, expect, it } from "vitest";
import { formatSpellLevel, formatSpellSlotChange } from "./spell-slot-format.js";

describe("spell slot formatting", () => {
	it("formats spell levels with ordinal suffixes", () => {
		expect(formatSpellLevel(1)).toBe("1st-level");
		expect(formatSpellLevel(2)).toBe("2nd-level");
		expect(formatSpellLevel(3)).toBe("3rd-level");
		expect(formatSpellLevel(4)).toBe("4th-level");
	});

	it("formats spell slot history entries", () => {
		expect(
			formatSpellSlotChange({
				id: "00000000-0000-4000-8000-000000000020",
				action: "defaults-applied",
				level: 3,
				previous: { total: 0, used: 0, remaining: 0 },
				next: { total: 2, used: 0, remaining: 2 },
				totalDelta: 2,
				usedDelta: 0,
				createdAt: "2026-07-01T12:00:00.000Z",
			}),
		).toBe("Applied defaults for 3rd-level: 2 slots");
	});
});
