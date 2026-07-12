import { Alert, Anchor, Button, Divider, Group, Stack, Text, Title } from "@mantine/core";
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
import { SpellDetailsModal } from "./spell-details-modal.js";
import { SpellSearchModal, type SpellSearchResult } from "./spell-search-modal.js";
import { formatSpellSlotChange } from "./spell-slot-format.js";
import { SpellSlotList } from "./spell-slot-list.js";

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
	const [draftTotals, setDraftTotals] = useState<Record<number, NumberDraft>>({});
	const [historyOpen, setHistoryOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [spellSearch, setSpellSearch] = useState<SpellSearchState | null>(null);
	const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const spellSlots = spellSlotsQuery.data?.spellSlots ?? [];
	const characterSpells = characterSpellsQuery.data?.spells ?? [];
	const spellSearchQueryText = spellSearch?.query.trim() ?? "";
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
		setDraftTotals({});
		setIsEditing(false);
		queryClient.setQueryData(apiQueryKeys.getCharacterSpellSlots({ characterId }), response);
	}

	function updateCachedCharacterSpells(response: CharacterSpellsResponse) {
		queryClient.setQueryData(apiQueryKeys.listCharacterSpells({ characterId }), response);
		closeSpellSearch();
	}

	const updateMutation = useMutation({
		...apiMutations.updateCharacterSpellSlots(),
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
		onSuccess: updateCachedSpellSlots,
	});
	const saveSpellMutation = useMutation({
		...apiMutations.saveCharacterSpell(),
		onSuccess: updateCachedCharacterSpells,
	});

	function setDraftTotal(slotLevel: number, value: NumberDraft) {
		setDraftTotals((current) => ({ ...current, [slotLevel]: value }));
	}

	function saveConfiguration() {
		if (spellSlots.length === 0) return;
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
		expendMutation.mutate({ params: { characterId }, body: { level: slot.level } });
	}

	function restoreSlot(slot: CharacterSpellSlot) {
		restoreMutation.mutate({ params: { characterId }, body: { level: slot.level } });
	}

	function applyDefaults() {
		defaultsMutation.mutate({ characterId });
	}

	function toggleEditing() {
		setDraftTotals({});
		setIsEditing((editing) => !editing);
	}

	function openSpellSearch(slotLevel: number) {
		const nextSearch = { slotLevel, query: "" };
		setSpellSearch(nextSearch);
	}

	function closeSpellSearch() {
		setSpellSearch(null);
	}

	function closeSpellDetails() {
		setSelectedSpellId(null);
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

	return (
		<Stack gap="md">
			<Divider />
			<Stack gap="xs">
				<Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
					<Stack gap={0} style={{ flex: "1 1 12rem" }}>
						<Title order={3} size="h5">
							Spell slots
						</Title>
						<Text c="dimmed" size="sm">
							Default profile: tier {level}
						</Text>
					</Stack>
					<Group gap="xs" justify="flex-end" style={{ flex: "1 1 12rem" }} wrap="wrap">
						<Button
							aria-expanded={historyOpen}
							color="gray"
							onClick={() => setHistoryOpen((opened) => !opened)}
							size="xs"
							variant="subtle"
							w={{ base: "100%", xs: "auto" }}
						>
							Spell history ({spellSlotsQuery.data?.recentSpellSlotChanges.length ?? 0})
						</Button>
						<Anchor color="gray" component="button" onClick={toggleEditing} size="sm" type="button">
							{isEditing ? "Done" : "Edit spells"}
						</Anchor>
					</Group>
				</Group>
			</Stack>

			{spellSlotsQuery.isLoading && <Text c="dimmed">Loading spell slots...</Text>}

			{historyOpen && (
				<Stack gap="xs">
					{spellSlotsQuery.data?.recentSpellSlotChanges.length ? (
						spellSlotsQuery.data.recentSpellSlotChanges.map((change) => (
							<Group key={change.id} justify="space-between">
								<Text size="sm">{formatSpellSlotChange(change)}</Text>
								<Text c="dimmed" size="xs">
									{new Date(change.createdAt).toLocaleString()}
								</Text>
							</Group>
						))
					) : (
						<Text c="dimmed" size="sm">
							No spell slot changes yet.
						</Text>
					)}
				</Stack>
			)}

			{isEditing && (
				<Group gap="xs" wrap="wrap">
					<Button
						color="gray"
						loading={defaultsMutation.isPending}
						onClick={applyDefaults}
						size="xs"
						style={{ flex: "1 1 11rem" }}
						variant="default"
					>
						Apply class defaults
					</Button>
					<Button
						disabled={spellSlots.length === 0}
						loading={updateMutation.isPending}
						onClick={saveConfiguration}
						size="xs"
						style={{ flex: "1 1 11rem" }}
						variant="default"
					>
						Apply changes
					</Button>
				</Group>
			)}

			<SpellSlotList
				characterSpells={characterSpells}
				draftTotals={draftTotals}
				isEditing={isEditing}
				onDraftTotalChange={setDraftTotal}
				onOpenSpellDetails={(spell) => setSelectedSpellId(spell.id)}
				onOpenSpellSearch={openSpellSearch}
				onRestoreSlot={restoreSlot}
				onUseSlot={expendSlot}
				spellSlots={spellSlots}
			/>

			{(spellSlotsQuery.error ||
				updateMutation.error ||
				expendMutation.error ||
				restoreMutation.error ||
				defaultsMutation.error) && (
				<Alert color="red" title="Spell slots unavailable" variant="light">
					Try the spell slot change again.
				</Alert>
			)}
			{(characterSpellsQuery.error ||
				spellSearchQuery.error ||
				spellDetailsQuery.error ||
				saveSpellMutation.error) && (
				<Alert color="red" title="Spells unavailable" variant="light">
					Try the spell change again.
				</Alert>
			)}

			<SpellSearchModal
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
				details={spellDetailsQuery.data?.spell ?? null}
				onClose={closeSpellDetails}
				opened={selectedSpellId !== null}
				pending={spellDetailsQuery.isFetching}
			/>
		</Stack>
	);
}

function toSlotTotal(value: NumberDraft, fallback: number) {
	return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}
