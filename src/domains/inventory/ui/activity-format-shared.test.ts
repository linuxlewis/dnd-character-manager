import { describe, expect, it } from "vitest";
import { asRecord, createMalformedActivityEntry } from "./activity-format-shared.js";

describe("activity formatter shared helpers", () => {
	it("keeps malformed rows represented without throwing", () => {
		expect(createMalformedActivityEntry().summary).toBe("This activity entry cannot be displayed.");
		expect(asRecord({ value: 1 })).toEqual({ value: 1 });
		expect(asRecord(null)).toBeNull();
	});
});
