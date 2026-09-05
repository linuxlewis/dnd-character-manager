import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { CharacterTreasuryResponse } from "../../../generated/api-client.generated.js";
import { apiMutations, apiQueries, apiQueryKeys } from "../../../generated/api-client.generated.js";
import {
	reconcileAndRelease,
	type TreasuryConfirmationContext,
	type TreasuryReconciliationState,
	toAddCharacterTreasuryRequest,
	toSpendCharacterTreasuryRequest,
	toTreasuryConflictError,
} from "./character-treasury-confirmation.js";
import { TreasuryPanel } from "./treasury-panel.js";
import type {
	TreasuryAddPreview,
	TreasuryAddRequest,
	TreasuryData,
	TreasurySpendPreview,
	TreasurySpendRequest,
} from "./treasury-types.js";

const INDETERMINATE_OUTCOME_MESSAGE =
	"The response was lost and the treasury changed before the result could be verified. The displayed balance is authoritative; review it before making another treasury change.";

export function CharacterTreasuryPanel({
	characterId,
	scopeLabel = "Personal Treasury",
}: {
	characterId: string;
	scopeLabel?: string;
}) {
	const queryClient = useQueryClient();
	const query = useQuery(apiQueries.getCharacterTreasury({ characterId }));
	const addMutation = useMutation(apiMutations.addCharacterTreasury());
	const spendMutation = useMutation(apiMutations.spendCharacterTreasury());
	const [addReconciliation, setAddReconciliation] = useState<TreasuryReconciliationState>({
		error: null,
		pending: false,
	});
	const [spendReconciliation, setSpendReconciliation] = useState<TreasuryReconciliationState>({
		error: null,
		pending: false,
	});
	const [indeterminateOutcome, setIndeterminateOutcome] = useState(false);
	const addConfirmationRef = useRef<TreasuryConfirmationContext | null>(null);
	const spendConfirmationRef = useRef<TreasuryConfirmationContext | null>(null);

	function cacheTreasury(response: Pick<CharacterTreasuryResponse, "treasury">) {
		updateTreasuryQueryCache(queryClient, characterId, response);
	}

	function submitAdd(
		request: TreasuryAddRequest,
		preview: TreasuryAddPreview,
		onSuccess: () => void,
	) {
		addMutation.reset();
		addConfirmationRef.current = {
			conflict: false,
			expectedNext: preview.next,
			mutationSucceeded: false,
			onApplied: onSuccess,
			onIndeterminate: () => {
				setIndeterminateOutcome(true);
				onSuccess();
			},
		};
		setAddReconciliation({ error: null, pending: true });
		void applyAdd(request, preview);
	}

	async function applyAdd(request: TreasuryAddRequest, preview: TreasuryAddPreview) {
		try {
			const response = await addMutation.mutateAsync({
				params: { characterId },
				body: toAddCharacterTreasuryRequest(request, preview),
			});
			cacheTreasury(response);
			if (addConfirmationRef.current) addConfirmationRef.current.mutationSucceeded = true;
		} catch (error) {
			if (toTreasuryConflictError(error) && addConfirmationRef.current) {
				addConfirmationRef.current.conflict = true;
			}
		} finally {
			await reconcileAndRelease(queryClient, characterId, setAddReconciliation, addConfirmationRef);
		}
	}

	function submitSpend(
		request: TreasurySpendRequest,
		preview: TreasurySpendPreview,
		onSuccess: () => void,
	) {
		spendMutation.reset();
		spendConfirmationRef.current = {
			conflict: false,
			expectedNext: preview.next,
			mutationSucceeded: false,
			onApplied: onSuccess,
			onIndeterminate: () => {
				setIndeterminateOutcome(true);
				onSuccess();
			},
		};
		setSpendReconciliation({ error: null, pending: true });
		void applySpend(request, preview);
	}

	async function applySpend(request: TreasurySpendRequest, preview: TreasurySpendPreview) {
		try {
			const response = await spendMutation.mutateAsync({
				params: { characterId },
				body: toSpendCharacterTreasuryRequest(request, preview),
			});
			cacheTreasury(response);
			if (spendConfirmationRef.current) spendConfirmationRef.current.mutationSucceeded = true;
		} catch (error) {
			if (toTreasuryConflictError(error) && spendConfirmationRef.current) {
				spendConfirmationRef.current.conflict = true;
			}
		} finally {
			await reconcileAndRelease(
				queryClient,
				characterId,
				setSpendReconciliation,
				spendConfirmationRef,
			);
		}
	}

	function retryAddReconciliation() {
		setAddReconciliation({ error: null, pending: true });
		void reconcileAndRelease(queryClient, characterId, setAddReconciliation, addConfirmationRef);
	}

	function retrySpendReconciliation() {
		setSpendReconciliation({ error: null, pending: true });
		void reconcileAndRelease(
			queryClient,
			characterId,
			setSpendReconciliation,
			spendConfirmationRef,
		);
	}

	const addConflictError = toTreasuryConflictError(addMutation.error);
	const spendConflictError = toTreasuryConflictError(spendMutation.error);

	return (
		<TreasuryPanel
			add={{
				mutationError: addConflictError ? null : addMutation.error,
				mutationPending: addMutation.isPending || addReconciliation.pending,
				onConfirm: submitAdd,
				onReset: () => {
					addConfirmationRef.current = null;
					setAddReconciliation({ error: null, pending: false });
					addMutation.reset();
				},
				onRetryReconciliation: retryAddReconciliation,
				reconciliationError: addReconciliation.error,
				reconciliationPending: addReconciliation.pending,
				stalePreviewError: addConflictError,
			}}
			indeterminateOutcome={
				indeterminateOutcome
					? {
							message: INDETERMINATE_OUTCOME_MESSAGE,
							onAcknowledge: () => setIndeterminateOutcome(false),
						}
					: null
			}
			query={{
				data: query.data ? toTreasuryData(query.data) : undefined,
				error: query.error,
				isLoading: query.isLoading,
				onRetry: () => void query.refetch(),
			}}
			scopeLabel={scopeLabel}
			spend={{
				mutationError: spendConflictError ? null : spendMutation.error,
				mutationPending: spendMutation.isPending || spendReconciliation.pending,
				onConfirm: submitSpend,
				onReset: () => {
					spendConfirmationRef.current = null;
					setSpendReconciliation({ error: null, pending: false });
					spendMutation.reset();
				},
				onRetryReconciliation: retrySpendReconciliation,
				reconciliationError: spendReconciliation.error,
				reconciliationPending: spendReconciliation.pending,
				stalePreviewError: spendConflictError,
			}}
		/>
	);
}

export function updateTreasuryQueryCache<
	Response extends { treasury: CharacterTreasuryResponse["treasury"] },
>(queryClient: QueryClient, characterId: string, response: Response) {
	queryClient.setQueryData<CharacterTreasuryResponse>(
		apiQueryKeys.getCharacterTreasury({ characterId }),
		{ treasury: response.treasury },
	);
}

export function toTreasuryData(response: CharacterTreasuryResponse): TreasuryData {
	return {
		balances: response.treasury.balances,
		totalValue: response.treasury.totalValue,
	};
}
