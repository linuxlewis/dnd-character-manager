import type { QueryClient } from "@tanstack/react-query";
import type { CharacterSpellSlotsResponse } from "../../../generated/api-client.generated.js";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { CharacterSpellSlot } from "../types/index.js";

export type SpellSlotAction = "used" | "restored";
export type SpellSlotConfirmationOutcome = "applied" | "safe-to-retry" | "indeterminate";

export interface SpellSlotConfirmationContext {
	action: SpellSlotAction;
	level: number;
	originalError: Error;
	expectedPrevious: CharacterSpellSlot;
	expectedNext: CharacterSpellSlot;
}

export function expectedSpellSlotAfterAction(slot: CharacterSpellSlot, action: SpellSlotAction) {
	const used = action === "used" ? slot.used + 1 : slot.used - 1;
	return { ...slot, used, remaining: slot.total - used };
}

export function classifySpellSlotConfirmationOutcome(
	context: SpellSlotConfirmationContext,
	response: CharacterSpellSlotsResponse,
): SpellSlotConfirmationOutcome {
	const actual = response.spellSlots.find((slot) => slot.level === context.level);
	if (!actual) return "indeterminate";
	if (sameSpellSlot(actual, context.expectedNext)) return "applied";
	if (sameSpellSlot(actual, context.expectedPrevious)) return "safe-to-retry";
	return "indeterminate";
}

export async function reconcileCharacterSpellSlotsQuery(
	queryClient: QueryClient,
	characterId: string,
) {
	const queryKey = apiQueryKeys.getCharacterSpellSlots({ characterId });
	await queryClient.invalidateQueries({ queryKey }, { throwOnError: true });
	const response = queryClient.getQueryData<CharacterSpellSlotsResponse>(queryKey);
	if (!response) throw new Error("The reconciled spell slot response was unavailable.");
	return response;
}

function sameSpellSlot(left: CharacterSpellSlot, right: CharacterSpellSlot) {
	return (
		left.total === right.total && left.used === right.used && left.remaining === right.remaining
	);
}
