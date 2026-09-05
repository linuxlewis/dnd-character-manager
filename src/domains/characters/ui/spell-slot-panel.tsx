import { useDebouncedValue } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
	CharacterSpellSlotsResponse,
	CharacterSpellsResponse,
} from "../../../generated/api-client.generated.js";
import {
	apiClient,
	apiMutations,
	apiQueries,
	apiQueryKeys,
} from "../../../generated/api-client.generated.js";
import type { CharacterSpellSlot } from "../types/index.js";
import type { NumberDraft } from "./health-dialogs.js";
import type { SpellSearchResult } from "./spell-search-modal.js";
import type { SpellSlotActionError } from "./spell-slot-panel-alerts.js";
import { SpellSlotPanelContent } from "./spell-slot-panel-content.js";
import { type SpellSearchPanelState, SpellSlotPanelDialogs } from "./spell-slot-panel-dialogs.js";
import { useSpellSlotActionRecovery } from "./use-spell-slot-action-recovery.js";

export function CharacterSpellSlotsPanel({
	characterId,
	level,
	sectionHeadingRef,
}: {
	characterId: string;
	level: number;
	sectionHeadingRef?: (node: HTMLHeadingElement | null) => void;
}) {
	const spellSlotsQuery = useQuery({
		...apiQueries.getCharacterSpellSlots({ characterId }),
		retry: false,
	});
	const characterSpellsQuery = useQuery({
		...apiQueries.listCharacterSpells({ characterId }),
		retry: false,
	});
	const [draftTotals, setDraftTotals] = useState<Record<number, NumberDraft>>({});
	const [historyOpen, setHistoryOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [spellSearch, setSpellSearch] = useState<SpellSearchPanelState | null>(null);
	const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
	const [searchVersion, setSearchVersion] = useState(0);
	const [spellSlotActionError, setSpellSlotActionError] = useState<SpellSlotActionError | null>(
		null,
	);
	const [spellActionError, setSpellActionError] = useState<Error | null>(null);
	const [spellToRemove, setSpellToRemove] = useState<
		CharacterSpellsResponse["spells"][number] | null
	>(null);
	const queryClient = useQueryClient();
	const spellSlotRecovery = useSpellSlotActionRecovery({
		characterId,
		onSlotResponse: updateCachedSpellSlots,
		queryClient,
	});
	const spellSlots = spellSlotsQuery.data?.spellSlots ?? [];
	const characterSpells = characterSpellsQuery.data?.spells ?? [];
	const nonSlotSpells = characterSpells.filter((spell) => spell.slotLevel === 0);
	const numberedSpells = characterSpells.filter((spell) => spell.slotLevel > 0);
	const spellSearchInputText = spellSearch?.query.trim() ?? "";
	const [debouncedSpellSearchInputText] = useDebouncedValue(spellSearchInputText, 300);
	const spellSearchQueryText =
		debouncedSpellSearchInputText === spellSearchInputText ? debouncedSpellSearchInputText : "";
	const spellSearchQuery = useQuery({
		enabled: spellSearch !== null && spellSearchQueryText.length > 0,
		queryKey: [
			"characterSpellSearch",
			characterId,
			searchVersion,
			spellSearch?.slotLevel,
			spellSearchQueryText,
		],
		queryFn: () =>
			apiClient.searchCharacterSpells(
				{ characterId },
				{ slotLevel: spellSearch?.slotLevel ?? 1, query: spellSearchQueryText },
			),
		retry: false,
	});
	const spellDetailsQuery = useQuery({
		...apiQueries.getCharacterSpellDetails({
			characterId,
			spellId: selectedSpellId ?? "00000000-0000-4000-8000-000000000000",
		}),
		enabled: selectedSpellId !== null,
		retry: false,
	});
	function updateCachedSpellSlots(response: CharacterSpellSlotsResponse) {
		setSpellSlotActionError(null);
		spellSlotRecovery.clear();
		setDraftTotals({});
		setIsEditing(false);
		queryClient.setQueryData(apiQueryKeys.getCharacterSpellSlots({ characterId }), response);
	}
	function updateCachedCharacterSpells(response: CharacterSpellsResponse) {
		setSpellActionError(null);
		queryClient.setQueryData(apiQueryKeys.listCharacterSpells({ characterId }), response);
	}
	const updateMutation = useMutation({
		...apiMutations.updateCharacterSpellSlots(),
		onError: (error) =>
			setSpellSlotActionError({ action: "saving spell slot configuration", error }),
		onSuccess: updateCachedSpellSlots,
	});
	const expendMutation = useMutation({
		...apiMutations.useCharacterSpellSlot(),
		onSuccess: updateCachedSpellSlots,
	});
	const restoreMutation = useMutation({
		...apiMutations.restoreCharacterSpellSlot(),
		onSuccess: updateCachedSpellSlots,
	});
	const defaultsMutation = useMutation({
		...apiMutations.applyCharacterSpellSlotDefaults(),
		onError: (error) => setSpellSlotActionError({ action: "applying class defaults", error }),
		onSuccess: updateCachedSpellSlots,
	});
	const saveSpellMutation = useMutation({
		...apiMutations.saveCharacterSpell(),
		onError: (error) => setSpellActionError(error),
		onSuccess: (response) => {
			updateCachedCharacterSpells(response);
			closeSpellSearch();
		},
	});
	const removeSpellMutation = useMutation({
		...apiMutations.removeCharacterSpell(),
		onError: (error) => setSpellActionError(error),
		onSuccess: (response) => {
			updateCachedCharacterSpells(response);
			setSpellToRemove(null);
		},
	});
	const spellSlotsUnavailable = Boolean(spellSlotsQuery.error);
	const spellsUnavailable = Boolean(characterSpellsQuery.error);
	function setDraftTotal(slotLevel: number, value: NumberDraft) {
		setDraftTotals((current) => ({ ...current, [slotLevel]: value }));
	}
	function saveConfiguration() {
		if (spellSlots.length === 0) return;
		updateMutation.reset();
		setSpellSlotActionError(null);
		spellSlotRecovery.clear();
		updateMutation.mutate({
			params: { characterId },
			body: {
				slots: spellSlots.map((slot) => ({
					level: slot.level,
					total: toSlotTotal(draftTotals[slot.level] ?? slot.total, slot.total),
				})),
			},
		});
	}
	function expendSlot(slot: CharacterSpellSlot) {
		expendMutation.reset();
		void spellSlotRecovery.start(slot, "used", () =>
			expendMutation.mutateAsync({ params: { characterId }, body: { level: slot.level } }),
		);
	}
	function restoreSlot(slot: CharacterSpellSlot) {
		restoreMutation.reset();
		void spellSlotRecovery.start(slot, "restored", () =>
			restoreMutation.mutateAsync({ params: { characterId }, body: { level: slot.level } }),
		);
	}
	function applyDefaults() {
		defaultsMutation.reset();
		setSpellSlotActionError(null);
		spellSlotRecovery.clear();
		defaultsMutation.mutate({ characterId });
	}
	function toggleEditing() {
		setSpellSlotActionError(null);
		spellSlotRecovery.clear();
		setDraftTotals({});
		setIsEditing((editing) => !editing);
	}
	function openSpellSearch(slotLevel: number) {
		const nextSearch = { slotLevel, query: "" };
		saveSpellMutation.reset();
		setSpellActionError(null);
		setSearchVersion((version) => version + 1);
		setSpellSearch(nextSearch);
	}
	function closeSpellSearch() {
		saveSpellMutation.reset();
		setSpellActionError(null);
		setSpellSearch(null);
	}
	function openSpellDetails(spell: CharacterSpellsResponse["spells"][number]) {
		void queryClient.resetQueries({
			queryKey: apiQueryKeys.getCharacterSpellDetails({ characterId, spellId: spell.id }),
			exact: true,
		});
		setSelectedSpellId(spell.id);
	}
	function openRemoveSpell(spell: CharacterSpellsResponse["spells"][number]) {
		removeSpellMutation.reset();
		setSpellActionError(null);
		setSpellToRemove(spell);
	}
	function closeRemoveSpellDialog() {
		if (removeSpellMutation.isPending) return;
		removeSpellMutation.reset();
		setSpellActionError(null);
		setSpellToRemove(null);
	}
	function updateSpellSearchQuery(query: string) {
		saveSpellMutation.reset();
		setSpellActionError(null);
		setSpellSearch((current) => (current ? { ...current, query } : current));
	}
	function saveSpell(spell: SpellSearchResult) {
		if (!spellSearch) return;
		saveSpellMutation.reset();
		setSpellActionError(null);
		saveSpellMutation.mutate({
			params: { characterId },
			body: { slotLevel: spellSearch.slotLevel, spellIndex: spell.index, source: spell.source },
		});
	}
	function removeSpell() {
		if (!spellToRemove) return;
		removeSpellMutation.reset();
		setSpellActionError(null);
		removeSpellMutation.mutate({ characterId, spellId: spellToRemove.id });
	}
	return (
		<SpellSlotPanelContent
			defaultsPending={defaultsMutation.isPending}
			draftTotals={draftTotals}
			historyChanges={spellSlotsQuery.data?.recentSpellSlotChanges ?? []}
			historyOpen={historyOpen}
			isEditing={isEditing}
			level={level}
			nonSlotSpells={nonSlotSpells}
			numberedSpells={numberedSpells}
			onApplyDefaults={applyDefaults}
			onDraftTotalChange={setDraftTotal}
			onOpenSpellDetails={openSpellDetails}
			onOpenSpellSearch={openSpellSearch}
			onRemoveSpell={openRemoveSpell}
			onRestoreSlot={restoreSlot}
			onRetrySpellSlots={() => void spellSlotsQuery.refetch()}
			onRetrySpells={() => void characterSpellsQuery.refetch()}
			onRetryReconciliation={() => void spellSlotRecovery.reconcile()}
			onAcknowledgeCurrentSlots={() => spellSlotRecovery.clear()}
			onSaveConfiguration={saveConfiguration}
			onToggleEditing={toggleEditing}
			onToggleHistory={() => setHistoryOpen((opened) => !opened)}
			onUseSlot={expendSlot}
			sectionHeadingRef={sectionHeadingRef}
			spellSlotActionError={spellSlotRecovery.actionError ?? spellSlotActionError}
			spellSlots={spellSlots}
			spellSlotsLoading={spellSlotsQuery.isLoading}
			spellSlotsUnavailable={spellSlotsUnavailable}
			spellsUnavailable={spellsUnavailable}
			reconciliationPending={spellSlotRecovery.reconciliationPending}
			slotActionsDisabled={
				spellSlotRecovery.actionsBlocked ||
				spellSlotRecovery.reconciliationPending ||
				expendMutation.isPending ||
				restoreMutation.isPending ||
				updateMutation.isPending ||
				defaultsMutation.isPending
			}
			updatePending={updateMutation.isPending}
		>
			<SpellSlotPanelDialogs
				actionError={spellActionError}
				details={spellDetailsQuery.data?.spell ?? null}
				detailsOpened={selectedSpellId !== null}
				detailsError={spellDetailsQuery.error}
				detailsPending={spellDetailsQuery.isFetching}
				onChangeQuery={updateSpellSearchQuery}
				onCloseDetails={() => setSelectedSpellId(null)}
				onCloseRemove={closeRemoveSpellDialog}
				onCloseSearch={closeSpellSearch}
				onRemove={removeSpell}
				onRetryDetails={() => void spellDetailsQuery.refetch()}
				onRetrySearch={() => void spellSearchQuery.refetch()}
				onSave={saveSpell}
				removeError={spellToRemove ? spellActionError : null}
				removePending={removeSpellMutation.isPending}
				searchError={spellSearchQuery.error}
				searchPending={spellSearchQuery.isFetching || saveSpellMutation.isPending}
				searchResults={spellSearchQuery.data?.spells ?? []}
				searchState={spellSearch}
				searched={spellSearchQueryText.length > 0 && !spellSearchQuery.isFetching}
				spellToRemove={spellToRemove}
			/>
		</SpellSlotPanelContent>
	);
}
function toSlotTotal(value: NumberDraft, fallback: number) {
	return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}
