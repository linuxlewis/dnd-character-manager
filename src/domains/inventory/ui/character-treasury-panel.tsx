import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
	AddCharacterTreasuryRequest,
	AddCharacterTreasuryResponse,
	CharacterTreasuryResponse,
	SpendCharacterTreasuryRequest,
	SpendCharacterTreasuryResponse,
} from "../../../generated/api-client.generated.js";
import { apiMutations, apiQueries, apiQueryKeys } from "../../../generated/api-client.generated.js";
import { TreasuryPanel } from "./treasury-panel.js";

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
	const [addPreviewRequest, setAddPreviewRequest] = useState<AddCharacterTreasuryRequest | null>(
		null,
	);
	const [spendPreviewRequest, setSpendPreviewRequest] =
		useState<SpendCharacterTreasuryRequest | null>(null);

	function cacheTreasury(response: AddCharacterTreasuryResponse | SpendCharacterTreasuryResponse) {
		updateTreasuryQueryCache(queryClient, characterId, response);
	}

	function previewAdd(request: AddCharacterTreasuryRequest) {
		setAddPreviewRequest(request);
		addPreviewMutation.reset();
		addPreviewMutation.mutate({ params: { characterId }, body: request });
	}

	function previewSpend(request: SpendCharacterTreasuryRequest) {
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
						},
					),
				onPreview: previewAdd,
				onReset: () => {
					setAddPreviewRequest(null);
					addPreviewMutation.reset();
					addMutation.reset();
				},
				preview: addPreviewMutation.data ?? null,
				previewError: addPreviewMutation.error,
				previewPending: addPreviewMutation.isPending,
				previewRequest: addPreviewRequest,
			}}
			query={{ data: query.data, error: query.error, isLoading: query.isLoading }}
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
						},
					),
				onPreview: previewSpend,
				onReset: () => {
					setSpendPreviewRequest(null);
					spendPreviewMutation.reset();
					spendMutation.reset();
				},
				preview: spendPreviewMutation.data ?? null,
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
