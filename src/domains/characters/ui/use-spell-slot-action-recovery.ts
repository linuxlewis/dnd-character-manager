import type { QueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { CharacterSpellSlotsResponse } from "../../../generated/api-client.generated.js";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { CharacterSpellSlot } from "../types/index.js";
import {
	classifySpellSlotConfirmationOutcome,
	expectedSpellSlotAfterAction,
	reconcileCharacterSpellSlotsQuery,
	type SpellSlotAction,
	type SpellSlotConfirmationContext,
} from "./character-spell-slot-confirmation.js";
import type { SpellSlotActionError } from "./spell-slot-panel-alerts.js";

export function useSpellSlotActionRecovery({
	characterId,
	onSlotResponse,
	queryClient,
}: {
	characterId: string;
	onSlotResponse: (response: CharacterSpellSlotsResponse) => void;
	queryClient: QueryClient;
}) {
	const [actionError, setActionError] = useState<SpellSlotActionError | null>(null);
	const [reconciliationPending, setReconciliationPending] = useState(false);
	const [actionsBlocked, setActionsBlocked] = useState(false);
	const confirmationRef = useRef<SpellSlotConfirmationContext | null>(null);

	function clear() {
		setActionError(null);
		setActionsBlocked(false);
		confirmationRef.current = null;
	}

	async function start(
		slot: CharacterSpellSlot,
		action: SpellSlotAction,
		mutate: () => Promise<CharacterSpellSlotsResponse>,
	) {
		clear();
		try {
			onSlotResponse(await mutate());
		} catch (error) {
			confirmationRef.current = createSpellSlotConfirmation(slot, action, toError(error));
			await reconcile();
		}
	}

	async function reconcile() {
		const confirmation = confirmationRef.current;
		if (!confirmation) return;

		setReconciliationPending(true);
		try {
			const response = await reconcileCharacterSpellSlotsQuery(queryClient, characterId);
			queryClient.setQueryData(apiQueryKeys.getCharacterSpellSlots({ characterId }), response);
			const outcome = classifySpellSlotConfirmationOutcome(confirmation, response);
			confirmationRef.current = null;
			setReconciliationPending(false);
			if (outcome === "applied") {
				setActionsBlocked(false);
				setActionError({
					action: actionLabel(confirmation.action),
					error: confirmation.originalError,
					status: "applied",
				});
				return;
			}
			if (outcome === "safe-to-retry") {
				setActionsBlocked(false);
				setActionError({
					action: actionLabel(confirmation.action),
					error: confirmation.originalError,
					status: "safe-to-retry",
				});
				return;
			}
			setActionsBlocked(true);
			setActionError({
				action: actionLabel(confirmation.action),
				error: confirmation.originalError,
				status: "indeterminate",
			});
		} catch (error) {
			setReconciliationPending(false);
			setActionsBlocked(true);
			setActionError({
				action: actionLabel(confirmation.action),
				error: confirmation.originalError,
				status: "reconciliation-failed",
				reconciliationError: toError(error),
			});
		}
	}

	return {
		actionError,
		actionsBlocked,
		clear,
		reconciliationPending,
		reconcile,
		start,
	};
}

export function createSpellSlotConfirmation(
	slot: CharacterSpellSlot,
	action: SpellSlotAction,
	error: Error,
): SpellSlotConfirmationContext {
	return {
		action,
		level: slot.level,
		originalError: error,
		expectedPrevious: slot,
		expectedNext: expectedSpellSlotAfterAction(slot, action),
	};
}

function actionLabel(action: SpellSlotAction) {
	return action === "used" ? "using a spell slot" : "restoring a spell slot";
}

function toError(error: unknown) {
	return error instanceof Error ? error : new Error("The spell slot action failed.");
}
