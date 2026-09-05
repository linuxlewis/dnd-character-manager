import { describe, expect, it } from "vitest";
import { createSpellSlotConfirmation } from "./use-spell-slot-action-recovery.js";

describe("useSpellSlotActionRecovery", () => {
	it("captures the pre-action slot and expected post-action state", () => {
		const slot = { level: 1, total: 2, used: 0, remaining: 2 };
		const error = new Error("response lost");

		expect(createSpellSlotConfirmation(slot, "used", error)).toEqual({
			action: "used",
			level: 1,
			originalError: error,
			expectedPrevious: slot,
			expectedNext: { level: 1, total: 2, used: 1, remaining: 1 },
		});
	});
});
