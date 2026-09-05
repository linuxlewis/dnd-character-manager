import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import {
	classifySpellSlotConfirmationOutcome,
	expectedSpellSlotAfterAction,
	reconcileCharacterSpellSlotsQuery,
	type SpellSlotConfirmationContext,
} from "./character-spell-slot-confirmation.js";

const characterId = "00000000-0000-4000-8000-000000000001";
const previous = { level: 1, total: 2, used: 0, remaining: 2 };

describe("character spell slot confirmation adapter", () => {
	it("classifies a committed response-lost action as applied", () => {
		const context = confirmation("used");

		expect(
			classifySpellSlotConfirmationOutcome(context, {
				spellSlots: [expectedSpellSlotAfterAction(previous, "used")],
				recentSpellSlotChanges: [],
			}),
		).toBe("applied");
	});

	it("allows a repeat only when reconciliation matches the pre-action state", () => {
		const context = confirmation("used");

		expect(
			classifySpellSlotConfirmationOutcome(context, {
				spellSlots: [previous],
				recentSpellSlotChanges: [],
			}),
		).toBe("safe-to-retry");
	});

	it("keeps reconciliation failure recoverable without replaying the action", async () => {
		const queryClient = new QueryClient();
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		invalidateQueries.mockRejectedValue(new Error("spell slot GET failed"));

		await expect(reconcileCharacterSpellSlotsQuery(queryClient, characterId)).rejects.toThrow(
			"spell slot GET failed",
		);
		expect(invalidateQueries).toHaveBeenCalledWith(
			{ queryKey: apiQueryKeys.getCharacterSpellSlots({ characterId }) },
			{ throwOnError: true },
		);
	});
});

function confirmation(action: "used" | "restored"): SpellSlotConfirmationContext {
	return {
		action,
		level: 1,
		originalError: new Error("response lost"),
		expectedPrevious: previous,
		expectedNext: expectedSpellSlotAfterAction(previous, action),
	};
}
