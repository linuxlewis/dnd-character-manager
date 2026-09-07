import { Button, Group, Stack, Text, Title } from "@mantine/core";
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
import { NonSlotSpellList } from "./non-slot-spell-list.js";
import { CharacterSpellConfiguration } from "./spell-configuration-modal.js";
import { SpellDetailsModal } from "./spell-details-modal.js";
import { SpellRemoveModal } from "./spell-remove-modal.js";
import { SpellSearchModal, type SpellSearchResult } from "./spell-search-modal.js";
import { SpellSlotHistory } from "./spell-slot-history.js";
import { SpellSlotList } from "./spell-slot-list.js";
import { SpellSlotPanelAlerts } from "./spell-slot-panel-alerts.js";

interface SpellSearchState {
	query: string;
	slotLevel: number;
}

export function CharacterSpellSlotsPanel({
	characterId,
	level,
}: {
	characterId: string;
	level: number;
}) {
	const spellSlotsQuery = useQuery(apiQueries.getCharacterSpellSlots({ characterId }));
	const characterSpellsQuery = useQuery(apiQueries.listCharacterSpells({ characterId }));
	const [historyOpen, setHistoryOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [configurationOpen, setConfigurationOpen] = useState(false);
	const [spellSearch, setSpellSearch] = useState<SpellSearchState | null>(null);
	const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
	const [spellToRemove, setSpellToRemove] = useState<
		CharacterSpellsResponse["spells"][number] | null
	>(null);
	const queryClient = useQueryClient();
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
		queryKey: ["characterSpellSearch", characterId, spellSearch?.slotLevel, spellSearchQueryText],
		queryFn: () =>
			apiClient.searchCharacterSpells(
				{ characterId },
				{ slotLevel: spellSearch?.slotLevel ?? 1, query: spellSearchQueryText },
			),
	});
	const spellDetailsQuery = useQuery({
		...apiQueries.getCharacterSpellDetails({
			characterId,
			spellId: selectedSpellId ?? "00000000-0000-4000-8000-000000000000",
		}),
		enabled: selectedSpellId !== null,
	});

	function updateCachedSpellSlots(response: CharacterSpellSlotsResponse) {
		setIsEditing(false);
		setConfigurationOpen(false);
		queryClient.setQueryData(apiQueryKeys.getCharacterSpellSlots({ characterId }), response);
	}

	function updateCachedCharacterSpells(response: CharacterSpellsResponse) {
		queryClient.setQueryData(apiQueryKeys.listCharacterSpells({ characterId }), response);
	}

	const expendMutation = useMutation({
		...apiMutations.useCharacterSpellSlot(),
		onSuccess: updateCachedSpellSlots,
	});
	const restoreMutation = useMutation({
		...apiMutations.restoreCharacterSpellSlot(),
		onSuccess: updateCachedSpellSlots,
	});
	const saveSpellMutation = useMutation({
		...apiMutations.saveCharacterSpell(),
		onSuccess: (response) => {
			updateCachedCharacterSpells(response);
			closeSpellSearch();
		},
	});
	const removeSpellMutation = useMutation({
		...apiMutations.removeCharacterSpell(),
		onSuccess: (response) => {
			updateCachedCharacterSpells(response);
			setSpellToRemove(null);
		},
	});
	const spellSlotsUnavailable = Boolean(
		spellSlotsQuery.error || expendMutation.error || restoreMutation.error,
	);
	const spellsUnavailable = Boolean(
		characterSpellsQuery.error ||
			spellSearchQuery.error ||
			spellDetailsQuery.error ||
			removeSpellMutation.error ||
			saveSpellMutation.error,
	);

	function expendSlot(slot: CharacterSpellSlot) {
		expendMutation.mutate({ params: { characterId }, body: { level: slot.level } });
	}

	function restoreSlot(slot: CharacterSpellSlot) {
		restoreMutation.mutate({ params: { characterId }, body: { level: slot.level } });
	}

	function toggleEditing() {
		setIsEditing((editing) => !editing);
	}

	function openSpellSearch(slotLevel: number) {
		const nextSearch = { slotLevel, query: "" };
		setSpellSearch(nextSearch);
	}

	function closeSpellSearch() {
		setSpellSearch(null);
	}

	function closeRemoveSpellDialog() {
		if (!removeSpellMutation.isPending) setSpellToRemove(null);
	}

	function updateSpellSearchQuery(query: string) {
		setSpellSearch((current) => (current ? { ...current, query } : current));
	}

	function saveSpell(spell: SpellSearchResult) {
		if (!spellSearch) return;
		saveSpellMutation.mutate({
			params: { characterId },
			body: { slotLevel: spellSearch.slotLevel, spellIndex: spell.index, source: spell.source },
		});
	}

	function removeSpell() {
		if (!spellToRemove) return;
		removeSpellMutation.mutate({ characterId, spellId: spellToRemove.id });
	}

	return (
		<Stack gap="md">
			<Group justify="space-between" gap="xs" wrap="wrap">
				<Title order={2} size={18}>
					Spells &amp; Abilities
				</Title>
				<Group gap={4}>
					<Button
						mih={44}
						variant="subtle"
						color="gray"
						aria-expanded={historyOpen}
						aria-label={`Spell history (${spellSlotsQuery.data?.recentSpellSlotChanges.length ?? 0})`}
						onClick={() => setHistoryOpen((opened) => !opened)}
					>
						History
					</Button>
					<Button mih={44} variant="subtle" onClick={toggleEditing}>
						{isEditing ? "Done" : "Edit spells"}
					</Button>
				</Group>
			</Group>
			{isEditing && (
				<Button
					mih={44}
					variant="default"
					onClick={() => {
						setConfigurationOpen(true);
					}}
				>
					Configure slots
				</Button>
			)}

			{spellSlotsQuery.isLoading && <Text c="dimmed">Loading spell slots...</Text>}

			<SpellSlotHistory
				changes={spellSlotsQuery.data?.recentSpellSlotChanges ?? []}
				opened={historyOpen}
			/>

			<NonSlotSpellList
				characterSpells={nonSlotSpells}
				isEditing={isEditing}
				onOpenSpellDetails={(spell) => setSelectedSpellId(spell.id)}
				onOpenSpellSearch={() => openSpellSearch(0)}
				onRemoveSpell={setSpellToRemove}
			/>

			<SpellSlotList
				pending={expendMutation.isPending || restoreMutation.isPending}
				characterSpells={numberedSpells}
				isEditing={isEditing}
				onOpenSpellDetails={(spell) => setSelectedSpellId(spell.id)}
				onOpenSpellSearch={openSpellSearch}
				onRemoveSpell={setSpellToRemove}
				onRestoreSlot={restoreSlot}
				onUseSlot={expendSlot}
				spellSlots={spellSlots}
			/>

			<SpellSlotPanelAlerts
				spellSlotsUnavailable={spellSlotsUnavailable}
				spellsUnavailable={spellsUnavailable}
			/>

			{configurationOpen && (
				<CharacterSpellConfiguration
					characterId={characterId}
					level={level}
					slots={spellSlots}
					onClose={() => setConfigurationOpen(false)}
					onSaved={updateCachedSpellSlots}
				/>
			)}

			<SpellSearchModal
				error={spellSearchQuery.error || saveSpellMutation.error}
				onChangeQuery={updateSpellSearchQuery}
				onClose={closeSpellSearch}
				onSaveSpell={saveSpell}
				opened={spellSearch !== null}
				pending={spellSearchQuery.isFetching || saveSpellMutation.isPending}
				query={spellSearch?.query ?? ""}
				results={spellSearchQuery.data?.spells ?? []}
				searched={spellSearchQueryText.length > 0 && !spellSearchQuery.isFetching}
				slotLevel={spellSearch?.slotLevel ?? 1}
			/>
			<SpellDetailsModal
				error={spellDetailsQuery.error}
				details={spellDetailsQuery.data?.spell ?? null}
				onClose={() => setSelectedSpellId(null)}
				opened={selectedSpellId !== null}
				pending={spellDetailsQuery.isFetching}
			/>
			<SpellRemoveModal
				error={removeSpellMutation.error}
				onClose={closeRemoveSpellDialog}
				onConfirm={removeSpell}
				pending={removeSpellMutation.isPending}
				spell={spellToRemove}
			/>
		</Stack>
	);
}
