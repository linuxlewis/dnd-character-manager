import { Anchor, Button, Group, NumberInput, Progress, Stack, Text } from "@mantine/core";
import type { CharacterSpellsResponse } from "../../../generated/api-client.generated.js";
import type { CharacterSpellSlot } from "../types/index.js";
import type { NumberDraft } from "./health-dialogs.js";
import { formatSpellEntryDetail, formatSpellLevel } from "./spell-slot-format.js";

interface SpellSlotListProps {
	characterSpells: CharacterSpellsResponse["spells"];
	draftTotals: Record<number, NumberDraft>;
	isEditing: boolean;
	onDraftTotalChange: (slotLevel: number, value: NumberDraft) => void;
	onOpenSpellDetails: (spell: CharacterSpellsResponse["spells"][number]) => void;
	onOpenSpellSearch: (slotLevel: number) => void;
	onRemoveSpell: (spell: CharacterSpellsResponse["spells"][number]) => void;
	onRestoreSlot: (slot: CharacterSpellSlot) => void;
	onUseSlot: (slot: CharacterSpellSlot) => void;
	spellSlots: CharacterSpellSlot[];
}

export function SpellSlotList({
	characterSpells,
	draftTotals,
	isEditing,
	onDraftTotalChange,
	onOpenSpellDetails,
	onOpenSpellSearch,
	onRemoveSpell,
	onRestoreSlot,
	onUseSlot,
	spellSlots,
}: SpellSlotListProps) {
	if (spellSlots.length === 0) return null;
	const visibleSpellSlots = spellSlots.filter(
		(slot) =>
			isEditing ||
			slot.total > 0 ||
			characterSpells.some((spell) => spell.slotLevel === slot.level),
	);
	if (visibleSpellSlots.length === 0) return null;

	return (
		<Stack gap="xs">
			{visibleSpellSlots.map((slot) => {
				const savedSpells = characterSpells.filter((spell) => spell.slotLevel === slot.level);
				return (
					<Stack key={slot.level} gap={4}>
						<Group align="end" gap="xs" justify="space-between" wrap="wrap">
							<Stack gap={2} style={{ flex: "1 1 8rem", minWidth: 0 }}>
								<Group align="center" gap="xs" wrap="nowrap">
									<Text fw={600} size="sm">
										{formatSpellLevel(slot.level)}
									</Text>
									<Button
										aria-label={`Add spell to ${formatSpellLevel(slot.level)}`}
										color="gray"
										onClick={() => onOpenSpellSearch(slot.level)}
										size="compact-xs"
										variant="subtle"
									>
										+
									</Button>
								</Group>
								<Text c="dimmed" size="xs">
									{slot.remaining} / {slot.total} remaining
								</Text>
								<Progress
									aria-label={`${formatSpellLevel(slot.level)} spell slots: ${slot.remaining} of ${slot.total} remaining`}
									color={getSlotUsageColor(slot)}
									radius="xs"
									size="xs"
									value={getSlotUsagePercent(slot)}
								/>
							</Stack>
							{isEditing ? (
								<NumberInput
									allowDecimal={false}
									allowNegative={false}
									hideControls
									label={`${formatSpellLevel(slot.level)} slot total`}
									min={0}
									onChange={(value) => onDraftTotalChange(slot.level, toDraft(value))}
									style={{ flex: "1 1 7rem" }}
									value={draftTotals[slot.level] ?? slot.total}
								/>
							) : (
								<Text c="dimmed" size="xs" style={{ flex: "1 1 7rem" }}>
									Total {slot.total}
								</Text>
							)}
							<Group gap="xs" grow style={{ flex: "1 1 12rem" }} wrap="nowrap">
								<Button
									aria-label={`Use ${formatSpellLevel(slot.level)}`}
									disabled={slot.remaining <= 0}
									onClick={() => onUseSlot(slot)}
									size="xs"
									variant="default"
								>
									Use
								</Button>
								<Button
									aria-label={`Restore ${formatSpellLevel(slot.level)}`}
									disabled={slot.used <= 0}
									onClick={() => onRestoreSlot(slot)}
									size="xs"
									variant="default"
								>
									Restore
								</Button>
							</Group>
						</Group>
						{savedSpells.length > 0 && (
							<Stack gap={2}>
								{savedSpells.map((spell) => (
									<Group key={spell.id} justify="space-between" gap="xs" wrap="nowrap">
										<Stack gap={0} style={{ flex: "1 1 auto", minWidth: 0 }}>
											<Anchor
												aria-label={`View ${spell.name} details`}
												component="button"
												onClick={() => onOpenSpellDetails(spell)}
												size="sm"
												ta="left"
												type="button"
											>
												{spell.name}
											</Anchor>
											<Text c="dimmed" size="xs">
												{formatSpellEntryDetail(spell)}
											</Text>
										</Stack>
										{isEditing && (
											<Button
												aria-label={`Remove ${spell.name}`}
												color="red"
												onClick={() => onRemoveSpell(spell)}
												size="compact-xs"
												variant="subtle"
											>
												Remove
											</Button>
										)}
									</Group>
								))}
							</Stack>
						)}
					</Stack>
				);
			})}
		</Stack>
	);
}

function toDraft(value: number | string): NumberDraft {
	return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function getSlotUsagePercent(slot: CharacterSpellSlot) {
	if (slot.total <= 0) return 0;
	return Math.round((slot.remaining / slot.total) * 100);
}

function getSlotUsageColor(slot: CharacterSpellSlot) {
	const usagePercent = getSlotUsagePercent(slot);
	if (slot.remaining <= 0 || (slot.total > 1 && slot.remaining === 1)) return "red";
	if (usagePercent <= 50) return "yellow";
	return "green";
}
