import type { QueryClient } from "@tanstack/react-query";
import type {
	AddCharacterTreasuryRequest,
	CharacterTreasuryResponse,
	SpendCharacterTreasuryRequest,
	TreasuryConflictResponse,
} from "../../../generated/api-client.generated.js";
import { ApiClientError, apiQueryKeys } from "../../../generated/api-client.generated.js";
import type {
	TreasuryAddPreview,
	TreasuryAddRequest,
	TreasuryBalance,
	TreasurySpendPreview,
	TreasurySpendRequest,
} from "./treasury-types.js";
import { treasuryBalancesEqual } from "./treasury-types.js";

export type TreasuryReconciliationState = { pending: boolean; error: Error | null };

export interface TreasuryConfirmationContext {
	conflict: boolean;
	expectedNext: TreasuryBalance;
	mutationSucceeded: boolean;
	onApplied: () => void;
}

type ConfirmationRef = { current: TreasuryConfirmationContext | null };

export function toAddCharacterTreasuryRequest(
	request: TreasuryAddRequest,
	preview: TreasuryAddPreview,
): AddCharacterTreasuryRequest {
	return { delta: request.delta, expectedPrevious: preview.previous };
}

export function toSpendCharacterTreasuryRequest(
	request: TreasurySpendRequest,
	preview: TreasurySpendPreview,
): SpendCharacterTreasuryRequest {
	return { amount: request.amount, expectedPrevious: preview.previous };
}

export function toTreasuryConflictError(error: unknown) {
	if (!(error instanceof ApiClientError) || error.status !== 409) return null;
	if (!isTreasuryConflictResponse(error.body)) return null;
	return new Error(
		"Treasury balances changed since this preview. Review the current balances and preview again before confirming.",
	);
}

export function shouldCompleteTreasuryConfirmation(
	context: TreasuryConfirmationContext,
	actual: TreasuryBalance,
) {
	return (
		context.mutationSucceeded ||
		(!context.conflict && treasuryBalancesEqual(actual, context.expectedNext))
	);
}

export async function reconcileTreasuryQuery(queryClient: QueryClient, characterId: string) {
	const queryKey = apiQueryKeys.getCharacterTreasury({ characterId });
	await queryClient.invalidateQueries({ queryKey }, { throwOnError: true });
	const response = queryClient.getQueryData<CharacterTreasuryResponse>(queryKey);
	if (!response) throw new Error("The reconciled treasury response was unavailable.");
	return response;
}

export async function reconcileAndRelease(
	queryClient: QueryClient,
	characterId: string,
	setState: (state: TreasuryReconciliationState) => void,
	confirmationRef: ConfirmationRef,
) {
	try {
		const response = await reconcileTreasuryQuery(queryClient, characterId);
		const confirmation = confirmationRef.current;
		confirmationRef.current = null;
		setState({ error: null, pending: false });
		if (
			confirmation &&
			shouldCompleteTreasuryConfirmation(confirmation, response.treasury.balances)
		) {
			confirmation.onApplied();
		}
	} catch (error) {
		setState({ error: toTreasuryError(error), pending: false });
	}
}

function isTreasuryConflictResponse(value: unknown): value is TreasuryConflictResponse {
	return isRecord(value) && isRecord(value.error) && value.error.code === "TREASURY_CONFLICT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function toTreasuryError(error: unknown) {
	return error instanceof Error
		? error
		: new Error("The treasury could not be reconciled. Retry when the service is available.");
}
