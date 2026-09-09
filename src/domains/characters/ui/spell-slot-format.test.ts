import { describe, expect, it } from "vitest";
import { formatSpellEntryDetail, formatSpellLevel } from "./spell-slot-format.js";

describe("spell slot formatting", () => {
	it("formats spell levels with ordinal suffixes", () => {
		expect(formatSpellLevel(1)).toBe("1st-level");
		expect(formatSpellLevel(2)).toBe("2nd-level");
		expect(formatSpellLevel(3)).toBe("3rd-level");
		expect(formatSpellLevel(4)).toBe("4th-level");
	});

	it("formats cantrip and feature entry details", () => {
		expect(formatSpellLevel(0)).toBe("cantrip");
		expect(formatSpellEntryDetail({ level: 0, source: "spell" })).toBe("Cantrip");
		expect(formatSpellEntryDetail({ level: 1, source: "spell" })).toBe("1st-level spell");
		expect(formatSpellEntryDetail({ level: 2, source: "feature" })).toBe("2nd-level feature");
	});
});
