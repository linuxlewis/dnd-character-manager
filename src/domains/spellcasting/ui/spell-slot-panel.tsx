import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type {
	CharacterSpellSlotsResponse,
	CharacterSpellsResponse,
} from "../../../generated/api-client.generated.js";
import { apiMutations, apiQueries, apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { CharacterSpellSlot } from "../types/index.js";
import { NonSlotSpellList } from "./non-slot-spell-list.js";
import { CharacterSpellConfiguration } from "./spell-configuration-modal.js";
import { SpellDetailsModal } from "./spell-details-modal.js";
import { SpellRemoveModal } from "./spell-remove-modal.js";
import { SpellSearchModal } from "./spell-search-modal.js";
import { SpellSlotList } from "./spell-slot-list.js";

type SpellDialog = { characterId: string } & (
	| { kind: "configuration" }
	| { kind: "search"; slotLevel: number }
	| { kind: "details"; spellId: string }
	| { kind: "remove"; spell: CharacterSpellsResponse["spells"][number] }
);

export function CharacterSpellSlotsPanel({
	characterId,
	level,
}: {
	characterId: string;
	level: number;
}) {
	const spellSlotsQuery = useQuery(apiQueries.getCharacterSpellSlots({ characterId }));
	const characterSpellsQuery = useQuery(apiQueries.listCharacterSpells({ characterId }));
	const [isEditing, setIsEditing] = useState(false);
	const [dialog, setDialog] = useState<SpellDialog | null>(null);
	const currentView = useRef({ characterId, dialog });
	currentView.current = { characterId, dialog };
	const queryClient = useQueryClient();
	const spellSlots = spellSlotsQuery.data?.spellSlots ?? [];
	const characterSpells = characterSpellsQuery.data?.spells ?? [];
	const nonSlotSpells = characterSpells.filter((spell) => spell.slotLevel === 0);

	function updateCachedSpellSlots(
		response: CharacterSpellSlotsResponse,
		variables: { params: { characterId: string } },
	) {
		queryClient.setQueryData(
			apiQueryKeys.getCharacterSpellSlots({ characterId: variables.params.characterId }),
			response,
		);
		if (
			currentView.current.characterId === variables.params.characterId &&
			!currentView.current.dialog
		) {
			setIsEditing(false);
		}
	}
	const expendMutation = useMutation({
		...apiMutations.useCharacterSpellSlot(),
		onSuccess: updateCachedSpellSlots,
	});
	const restoreMutation = useMutation({
		...apiMutations.restoreCharacterSpellSlot(),
		onSuccess: updateCachedSpellSlots,
	});
	const pending = expendMutation.isPending || restoreMutation.isPending;
	const spellSlotsUnavailable = Boolean(
		spellSlotsQuery.error || expendMutation.error || restoreMutation.error,
	);

	function expendSlot(slot: CharacterSpellSlot) {
		if (!pending) expendMutation.mutate({ params: { characterId }, body: { level: slot.level } });
	}
	function restoreSlot(slot: CharacterSpellSlot) {
		if (!pending) restoreMutation.mutate({ params: { characterId }, body: { level: slot.level } });
	}
	function openSpellSearch(slotLevel: number) {
		setDialog({ kind: "search", characterId, slotLevel });
	}
	function closeDialog() {
		setDialog((current) => (current === dialog ? null : current));
	}

	return (
		<Stack gap="md">
			<Group justify="space-between" gap="xs" wrap="wrap">
				<Title order={2} size={18}>
					Spells &amp; Abilities
				</Title>
				<Button mih={44} variant="subtle" onClick={() => setIsEditing((editing) => !editing)}>
					{isEditing ? "Done" : "Edit spells"}
				</Button>
			</Group>
			{isEditing && (
				<Button
					mih={44}
					variant="default"
					onClick={() => setDialog({ kind: "configuration", characterId })}
				>
					Configure slots
				</Button>
			)}
			{spellSlotsQuery.isLoading && <Text c="dimmed">Loading spell slots...</Text>}
			<NonSlotSpellList
				characterSpells={nonSlotSpells}
				isEditing={isEditing}
				onOpenSpellDetails={(spell) =>
					setDialog({ kind: "details", characterId, spellId: spell.id })
				}
				onOpenSpellSearch={() => openSpellSearch(0)}
				onRemoveSpell={(spell) => setDialog({ kind: "remove", characterId, spell })}
			/>
			<SpellSlotList
				pending={pending}
				characterSpells={characterSpells}
				isEditing={isEditing}
				onOpenSpellDetails={(spell) =>
					setDialog({ kind: "details", characterId, spellId: spell.id })
				}
				onOpenSpellSearch={openSpellSearch}
				onRemoveSpell={(spell) => setDialog({ kind: "remove", characterId, spell })}
				onRestoreSlot={restoreSlot}
				onUseSlot={expendSlot}
				spellSlots={spellSlots}
			/>
			{spellSlotsUnavailable && (
				<Alert color="red" title="Spell slots unavailable" variant="light">
					Try the spell slot change again.
				</Alert>
			)}
			{characterSpellsQuery.error && (
				<Alert color="red" title="Spells unavailable" variant="light">
					Try the spell change again.
				</Alert>
			)}
			{dialog?.characterId === characterId && dialog.kind === "configuration" && (
				<CharacterSpellConfiguration
					key={`${characterId}:configuration`}
					characterId={characterId}
					level={level}
					slots={spellSlots}
					onClose={closeDialog}
					onSaved={(response, ownerId) => {
						queryClient.setQueryData(
							apiQueryKeys.getCharacterSpellSlots({ characterId: ownerId }),
							response,
						);
						if (
							currentView.current.characterId === ownerId &&
							currentView.current.dialog === dialog
						) {
							setIsEditing(false);
							closeDialog();
						}
					}}
				/>
			)}
			{dialog?.characterId === characterId && dialog.kind === "search" && (
				<SpellSearchModal
					key={`${characterId}:search:${dialog.slotLevel}`}
					characterId={characterId}
					slotLevel={dialog.slotLevel}
					onClose={closeDialog}
				/>
			)}
			{dialog?.characterId === characterId && dialog.kind === "details" && (
				<SpellDetailsModal
					key={`${characterId}:details:${dialog.spellId}`}
					characterId={characterId}
					spellId={dialog.spellId}
					onClose={closeDialog}
				/>
			)}
			{dialog?.characterId === characterId && dialog.kind === "remove" && (
				<SpellRemoveModal
					key={`${characterId}:remove:${dialog.spell.id}`}
					characterId={characterId}
					spell={dialog.spell}
					onClose={closeDialog}
				/>
			)}
		</Stack>
	);
}
