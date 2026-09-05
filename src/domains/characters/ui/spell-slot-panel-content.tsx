import { Anchor, Button, Divider, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import type {
	CharacterSpellSlotsResponse,
	CharacterSpellsResponse,
} from "../../../generated/api-client.generated.js";
import type { CharacterSpellSlot } from "../types/index.js";
import type { NumberDraft } from "./health-dialogs.js";
import { NonSlotSpellList } from "./non-slot-spell-list.js";
import { SpellSlotEditActions } from "./spell-slot-edit-actions.js";
import { SpellSlotHistory } from "./spell-slot-history.js";
import { SpellSlotList } from "./spell-slot-list.js";
import { type SpellSlotActionError, SpellSlotPanelAlerts } from "./spell-slot-panel-alerts.js";

export function SpellSlotPanelContent({
	children,
	defaultsPending,
	draftTotals,
	historyChanges,
	historyOpen,
	isEditing,
	level,
	nonSlotSpells,
	numberedSpells,
	onApplyDefaults,
	onDraftTotalChange,
	onOpenSpellDetails,
	onOpenSpellSearch,
	onRemoveSpell,
	onRestoreSlot,
	onRetrySpellSlots,
	onRetrySpells,
	onRetryReconciliation,
	onAcknowledgeCurrentSlots,
	onSaveConfiguration,
	onToggleEditing,
	onToggleHistory,
	onUseSlot,
	sectionHeadingRef,
	spellSlotActionError,
	spellSlots,
	spellSlotsLoading,
	spellSlotsUnavailable,
	spellsUnavailable,
	reconciliationPending,
	slotActionsDisabled,
	updatePending,
}: {
	children: ReactNode;
	defaultsPending: boolean;
	draftTotals: Record<number, NumberDraft>;
	historyChanges: CharacterSpellSlotsResponse["recentSpellSlotChanges"];
	historyOpen: boolean;
	isEditing: boolean;
	level: number;
	nonSlotSpells: CharacterSpellsResponse["spells"];
	numberedSpells: CharacterSpellsResponse["spells"];
	onApplyDefaults: () => void;
	onDraftTotalChange: (slotLevel: number, value: NumberDraft) => void;
	onOpenSpellDetails: (spell: CharacterSpellsResponse["spells"][number]) => void;
	onOpenSpellSearch: (slotLevel: number) => void;
	onRemoveSpell: (spell: CharacterSpellsResponse["spells"][number]) => void;
	onRestoreSlot: (slot: CharacterSpellSlot) => void;
	onRetrySpellSlots: () => void;
	onRetrySpells: () => void;
	onRetryReconciliation?: () => void;
	onAcknowledgeCurrentSlots?: () => void;
	onSaveConfiguration: () => void;
	onToggleEditing: () => void;
	onToggleHistory: () => void;
	onUseSlot: (slot: CharacterSpellSlot) => void;
	sectionHeadingRef?: (node: HTMLHeadingElement | null) => void;
	spellSlotActionError: SpellSlotActionError | null;
	spellSlots: CharacterSpellSlot[];
	spellSlotsLoading: boolean;
	spellSlotsUnavailable: boolean;
	spellsUnavailable: boolean;
	reconciliationPending?: boolean;
	slotActionsDisabled?: boolean;
	updatePending: boolean;
}) {
	return (
		<Stack gap="md">
			<Stack gap={2}>
				<Title
					id="character-section-spells-heading"
					order={3}
					ref={sectionHeadingRef}
					tabIndex={-1}
					size="h4"
				>
					Spells &amp; Abilities
				</Title>
				<Text c="dimmed" size="sm">
					Track spell slots, cantrips, features, and saved spells.
				</Text>
			</Stack>
			<Divider />
			<Stack gap="xs">
				<Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
					<Stack gap={0} style={{ flex: "1 1 12rem" }}>
						<Title order={4} size="h5">
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
							onClick={onToggleHistory}
							size="xs"
							variant="subtle"
							w={{ base: "100%", xs: "auto" }}
						>
							Spell history ({historyChanges.length})
						</Button>
						<Anchor
							color="gray"
							component="button"
							onClick={onToggleEditing}
							size="sm"
							type="button"
						>
							{isEditing ? "Done" : "Edit spells"}
						</Anchor>
					</Group>
				</Group>
			</Stack>
			{spellSlotsLoading && <Text c="dimmed">Loading spell slots...</Text>}
			<SpellSlotHistory changes={historyChanges} opened={historyOpen} />
			<SpellSlotEditActions
				defaultsPending={defaultsPending}
				disabled={spellSlots.length === 0}
				isEditing={isEditing}
				onApplyDefaults={onApplyDefaults}
				onSaveConfiguration={onSaveConfiguration}
				updatePending={updatePending}
			/>
			<NonSlotSpellList
				characterSpells={nonSlotSpells}
				isEditing={isEditing}
				onOpenSpellDetails={onOpenSpellDetails}
				onOpenSpellSearch={() => onOpenSpellSearch(0)}
				onRemoveSpell={onRemoveSpell}
			/>
			<SpellSlotList
				characterSpells={numberedSpells}
				draftTotals={draftTotals}
				isEditing={isEditing}
				onDraftTotalChange={onDraftTotalChange}
				onOpenSpellDetails={onOpenSpellDetails}
				onOpenSpellSearch={onOpenSpellSearch}
				onRemoveSpell={onRemoveSpell}
				onRestoreSlot={onRestoreSlot}
				onUseSlot={onUseSlot}
				actionsDisabled={slotActionsDisabled}
				spellSlots={spellSlots}
			/>
			<SpellSlotPanelAlerts
				onRetrySpellSlots={onRetrySpellSlots}
				onRetrySpells={onRetrySpells}
				onRetryReconciliation={onRetryReconciliation}
				onAcknowledgeCurrentSlots={onAcknowledgeCurrentSlots}
				reconciliationPending={reconciliationPending}
				spellSlotActionError={spellSlotActionError}
				spellSlotsUnavailable={spellSlotsUnavailable}
				spellsUnavailable={spellsUnavailable}
			/>
			{children}
		</Stack>
	);
}
