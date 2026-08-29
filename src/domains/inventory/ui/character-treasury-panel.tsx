import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type {
	AddCharacterTreasuryPreviewResponse,
	CharacterTreasuryResponse,
	SpendCharacterTreasuryPreviewResponse,
} from "../../../generated/api-client.generated.js";
import { apiMutations, apiQueries, apiQueryKeys } from "../../../generated/api-client.generated.js";
import { TreasuryPanel } from "./treasury-panel.js";
import type {
	TreasuryAddPreview,
	TreasuryAddRequest,
	TreasuryData,
	TreasurySpendPreview,
	TreasurySpendRequest,
} from "./treasury-types.js";
import { treasuryBalancesEqual } from "./treasury-types.js";

export type TreasuryReconciliationState = { pending: boolean; error: Error | null };
type CompletionRef = { current: (() => void) | null };

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
	const addCompletionRef = useRef<(() => void) | null>(null);
	const spendCompletionRef = useRef<(() => void) | null>(null);

	function cacheTreasury(response: Pick<CharacterTreasuryResponse, "treasury">) {
		updateTreasuryQueryCache(queryClient, characterId, response);
	}

	function previewAdd(request: TreasuryAddRequest) {
		setAddPreviewRequest(request);
		addPreviewMutation.reset();
		addPreviewMutation.mutate({ params: { characterId }, body: request });
	}

	function previewSpend(request: TreasurySpendRequest) {
		setSpendPreviewRequest(request);
		spendPreviewMutation.reset();
		spendPreviewMutation.mutate({ params: { characterId }, body: request });
	}

	async function refreshAddPreview(request: TreasuryAddRequest) {
		setAddPreviewRequest(request);
		addPreviewMutation.reset();
		return addPreviewMutation.mutateAsync({ params: { characterId }, body: request });
	}

	async function refreshSpendPreview(request: TreasurySpendRequest) {
		setSpendPreviewRequest(request);
		spendPreviewMutation.reset();
		return spendPreviewMutation.mutateAsync({ params: { characterId }, body: request });
	}

	function confirmAdd(
		request: TreasuryAddRequest,
		preview: TreasuryAddPreview,
		onSuccess: () => void,
	) {
		addCompletionRef.current = null;
		setAddReconciliation({ error: null, pending: true });
		void confirmAddAfterFreshPreview(request, preview, onSuccess);
	}

	async function confirmAddAfterFreshPreview(
		request: TreasuryAddRequest,
		preview: TreasuryAddPreview,
		onSuccess: () => void,
	) {
		try {
			const freshResponse = await refreshAddPreview(request);
			cacheTreasury(freshResponse);
			if (!treasuryBalancesEqual(preview.previous, freshResponse.preview.previous)) {
				setAddReconciliation({ error: null, pending: false });
				return;
			}

			consumeTreasuryPreview(setAddPreviewRequest, () => addPreviewMutation.reset());
			try {
				const response = await addMutation.mutateAsync({ params: { characterId }, body: request });
				cacheTreasury(response);
				addCompletionRef.current = onSuccess;
			} catch {
				// Keep the mutation error visible while reconciliation establishes the authoritative state.
			} finally {
				await reconcileAndRelease(queryClient, characterId, setAddReconciliation, addCompletionRef);
			}
		} catch {
			setAddReconciliation({ error: null, pending: false });
		}
	}

	function confirmSpend(
		request: TreasurySpendRequest,
		preview: TreasurySpendPreview,
		onSuccess: () => void,
	) {
		spendCompletionRef.current = null;
		setSpendReconciliation({ error: null, pending: true });
		void confirmSpendAfterFreshPreview(request, preview, onSuccess);
	}

	async function confirmSpendAfterFreshPreview(
		request: TreasurySpendRequest,
		preview: TreasurySpendPreview,
		onSuccess: () => void,
	) {
		try {
			const freshResponse = await refreshSpendPreview(request);
			cacheTreasury(freshResponse);
			if (!treasuryBalancesEqual(preview.previous, freshResponse.preview.previous)) {
				setSpendReconciliation({ error: null, pending: false });
				return;
			}

			consumeTreasuryPreview(setSpendPreviewRequest, () => spendPreviewMutation.reset());
			try {
				const response = await spendMutation.mutateAsync({
					params: { characterId },
					body: request,
				});
				cacheTreasury(response);
				spendCompletionRef.current = onSuccess;
			} catch {
				// Keep the mutation error visible while reconciliation establishes the authoritative state.
			} finally {
				await reconcileAndRelease(
					queryClient,
					characterId,
					setSpendReconciliation,
					spendCompletionRef,
				);
			}
		} catch {
			setSpendReconciliation({ error: null, pending: false });
		}
	}

	function retryAddReconciliation() {
		setAddReconciliation({ error: null, pending: true });
		void reconcileAndRelease(queryClient, characterId, setAddReconciliation, addCompletionRef);
	}

	function retrySpendReconciliation() {
		setSpendReconciliation({ error: null, pending: true });
		void reconcileAndRelease(queryClient, characterId, setSpendReconciliation, spendCompletionRef);
	}

	return (
		<TreasuryPanel
			add={{
				mutationError: addMutation.error,
				mutationPending: addMutation.isPending || addReconciliation.pending,
				onConfirm: confirmAdd,
				onConsumePreview: () =>
					consumeTreasuryPreview(setAddPreviewRequest, () => addPreviewMutation.reset()),
				onPreview: previewAdd,
				onReset: () => {
					addCompletionRef.current = null;
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
			}}
			query={{
				data: query.data ? toTreasuryData(query.data) : undefined,
				error: query.error,
				isLoading: query.isLoading,
			}}
			scopeLabel={scopeLabel}
			spend={{
				mutationError: spendMutation.error,
				mutationPending: spendMutation.isPending || spendReconciliation.pending,
				onConfirm: confirmSpend,
				onConsumePreview: () =>
					consumeTreasuryPreview(setSpendPreviewRequest, () => spendPreviewMutation.reset()),
				onPreview: previewSpend,
				onReset: () => {
					spendCompletionRef.current = null;
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

export function reconcileTreasuryQuery(queryClient: QueryClient, characterId: string) {
	return queryClient.invalidateQueries(
		{
			queryKey: apiQueryKeys.getCharacterTreasury({ characterId }),
		},
		{ throwOnError: true },
	);
}

export async function reconcileAndRelease(
	queryClient: QueryClient,
	characterId: string,
	setState: (state: TreasuryReconciliationState) => void,
	completionRef: CompletionRef,
) {
	try {
		await reconcileTreasuryQuery(queryClient, characterId);
		setState({ error: null, pending: false });
		const onReconciled = completionRef.current;
		completionRef.current = null;
		onReconciled?.();
	} catch (error) {
		setState({ error: toTreasuryError(error), pending: false });
	}
}

function toTreasuryError(error: unknown) {
	return error instanceof Error
		? error
		: new Error("The treasury could not be reconciled. Retry when the service is available.");
}
