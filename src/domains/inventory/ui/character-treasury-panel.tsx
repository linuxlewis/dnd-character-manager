import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type {
	AddCharacterTreasuryPreviewResponse,
	CharacterTreasuryResponse,
	SpendCharacterTreasuryPreviewResponse,
} from "../../../generated/api-client.generated.js";
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
	"The confirmation response was lost and the treasury changed before the result could be verified. The displayed balance is authoritative; review it before making another treasury change.";

export function CharacterTreasuryPanel({
	characterId,
	scopeLabel = "Personal Treasury",
}: {
	characterId: string;
	scopeLabel?: string;
}) {
	const queryClient = useQueryClient();
	const query = useQuery(apiQueries.getCharacterTreasury({ characterId }));
	const addPreviewMutation = useMutation(apiMutations.previewAddCharacterTreasury());
	const spendPreviewMutation = useMutation(apiMutations.previewSpendCharacterTreasury());
	const addMutation = useMutation(apiMutations.addCharacterTreasury());
	const spendMutation = useMutation(apiMutations.spendCharacterTreasury());
	const [addPreviewRequest, setAddPreviewRequest] = useState<TreasuryAddRequest | null>(null);
	const [spendPreviewRequest, setSpendPreviewRequest] = useState<TreasurySpendRequest | null>(null);
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

	function previewAdd(request: TreasuryAddRequest) {
		setAddPreviewRequest(request);
		addPreviewMutation.reset();
		addMutation.reset();
		addPreviewMutation.mutate({ params: { characterId }, body: request });
	}

	function previewSpend(request: TreasurySpendRequest) {
		setSpendPreviewRequest(request);
		spendPreviewMutation.reset();
		spendMutation.reset();
		spendPreviewMutation.mutate({ params: { characterId }, body: request });
	}

	function confirmAdd(
		request: TreasuryAddRequest,
		preview: TreasuryAddPreview,
		onSuccess: () => void,
	) {
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
		void applyAddConfirmation(request, preview);
	}

	async function applyAddConfirmation(request: TreasuryAddRequest, preview: TreasuryAddPreview) {
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

	function confirmSpend(
		request: TreasurySpendRequest,
		preview: TreasurySpendPreview,
		onSuccess: () => void,
	) {
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
		void applySpendConfirmation(request, preview);
	}

	async function applySpendConfirmation(
		request: TreasurySpendRequest,
		preview: TreasurySpendPreview,
	) {
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
				onConfirm: confirmAdd,
				onConsumePreview: () =>
					consumeTreasuryPreview(setAddPreviewRequest, () => addPreviewMutation.reset()),
				onPreview: previewAdd,
				onReset: () => {
					addConfirmationRef.current = null;
					setAddReconciliation({ error: null, pending: false });
					consumeTreasuryPreview(setAddPreviewRequest, () => addPreviewMutation.reset());
					addMutation.reset();
				},
				onRetryReconciliation: retryAddReconciliation,
				preview: toAddTreasuryPreview(addPreviewMutation.data),
				previewError: addPreviewMutation.error,
				previewPending: addPreviewMutation.isPending,
				previewRequest: addPreviewRequest,
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
			}}
			scopeLabel={scopeLabel}
			spend={{
				mutationError: spendConflictError ? null : spendMutation.error,
				mutationPending: spendMutation.isPending || spendReconciliation.pending,
				onConfirm: confirmSpend,
				onConsumePreview: () =>
					consumeTreasuryPreview(setSpendPreviewRequest, () => spendPreviewMutation.reset()),
				onPreview: previewSpend,
				onReset: () => {
					spendConfirmationRef.current = null;
					setSpendReconciliation({ error: null, pending: false });
					consumeTreasuryPreview(setSpendPreviewRequest, () => spendPreviewMutation.reset());
					spendMutation.reset();
				},
				onRetryReconciliation: retrySpendReconciliation,
				preview: toSpendTreasuryPreview(spendPreviewMutation.data),
				previewError: spendPreviewMutation.error,
				previewPending: spendPreviewMutation.isPending,
				previewRequest: spendPreviewRequest,
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

export function toAddTreasuryPreview(
	response: AddCharacterTreasuryPreviewResponse | undefined,
): TreasuryAddPreview | null {
	return response?.preview ?? null;
}

export function toSpendTreasuryPreview(
	response: SpendCharacterTreasuryPreviewResponse | undefined,
): TreasurySpendPreview | null {
	return response?.preview ?? null;
}

export function consumeTreasuryPreview<Request>(
	setPreviewRequest: (request: Request | null) => void,
	resetPreview: () => void,
) {
	setPreviewRequest(null);
	resetPreview();
}
