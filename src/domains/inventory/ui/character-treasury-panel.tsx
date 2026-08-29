import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
	AddCharacterTreasuryPreviewResponse,
	AddCharacterTreasuryResponse,
	CharacterTreasuryResponse,
	SpendCharacterTreasuryPreviewResponse,
	SpendCharacterTreasuryResponse,
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

	function cacheTreasury(response: AddCharacterTreasuryResponse | SpendCharacterTreasuryResponse) {
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

	return (
		<TreasuryPanel
			add={{
				mutationError: addMutation.error,
				mutationPending: addMutation.isPending,
				onConfirm: (request, onSuccess) =>
					addMutation.mutate(
						{ params: { characterId }, body: request },
						{
							onSuccess: (response) => {
								cacheTreasury(response);
								onSuccess();
							},
							onSettled: () => {
								void reconcileTreasuryQuery(queryClient, characterId);
							},
						},
					),
				onConsumePreview: () =>
					consumeTreasuryPreview(setAddPreviewRequest, () => addPreviewMutation.reset()),
				onPreview: previewAdd,
				onReset: () => {
					consumeTreasuryPreview(setAddPreviewRequest, () => addPreviewMutation.reset());
					addMutation.reset();
				},
				preview: toAddTreasuryPreview(addPreviewMutation.data),
				previewError: addPreviewMutation.error,
				previewPending: addPreviewMutation.isPending,
				previewRequest: addPreviewRequest,
			}}
			query={{
				data: query.data ? toTreasuryData(query.data) : undefined,
				error: query.error,
				isLoading: query.isLoading,
			}}
			scopeLabel={scopeLabel}
			spend={{
				mutationError: spendMutation.error,
				mutationPending: spendMutation.isPending,
				onConfirm: (request, onSuccess) =>
					spendMutation.mutate(
						{ params: { characterId }, body: request },
						{
							onSuccess: (response) => {
								cacheTreasury(response);
								onSuccess();
							},
							onSettled: () => {
								void reconcileTreasuryQuery(queryClient, characterId);
							},
						},
					),
				onConsumePreview: () =>
					consumeTreasuryPreview(setSpendPreviewRequest, () => spendPreviewMutation.reset()),
				onPreview: previewSpend,
				onReset: () => {
					consumeTreasuryPreview(setSpendPreviewRequest, () => spendPreviewMutation.reset());
					spendMutation.reset();
				},
				preview: toSpendTreasuryPreview(spendPreviewMutation.data),
				previewError: spendPreviewMutation.error,
				previewPending: spendPreviewMutation.isPending,
				previewRequest: spendPreviewRequest,
			}}
		/>
	);
}

export function updateTreasuryQueryCache(
	queryClient: QueryClient,
	characterId: string,
	response: AddCharacterTreasuryResponse | SpendCharacterTreasuryResponse,
) {
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
	return queryClient.invalidateQueries({
		queryKey: apiQueryKeys.getCharacterTreasury({ characterId }),
	});
}
