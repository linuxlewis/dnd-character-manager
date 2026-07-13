import { Anchor, Button, Group, Stack, Text } from "@mantine/core";
import type { CharacterSpellsResponse } from "../../../generated/api-client.generated.js";
import { formatSpellEntryDetail } from "./spell-slot-format.js";

interface NonSlotSpellListProps {
	characterSpells: CharacterSpellsResponse["spells"];
	isEditing: boolean;
	onOpenSpellDetails: (spell: CharacterSpellsResponse["spells"][number]) => void;
	onOpenSpellSearch: () => void;
	onRemoveSpell: (spell: CharacterSpellsResponse["spells"][number]) => void;
}

export function NonSlotSpellList({
	characterSpells,
	isEditing,
	onOpenSpellDetails,
	onOpenSpellSearch,
	onRemoveSpell,
}: NonSlotSpellListProps) {
	return (
		<Stack gap="xs">
			<Group align="center" justify="space-between" wrap="wrap">
				<Text fw={600} size="sm">
					Cantrips & features
				</Text>
				<Button
					aria-label="Add cantrip or feature"
					color="gray"
					onClick={onOpenSpellSearch}
					size="compact-xs"
					variant="subtle"
				>
					+
				</Button>
			</Group>
			{characterSpells.length > 0 ? (
				<Stack gap={2}>
					{characterSpells.map((spell) => (
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
			) : (
				<Text c="dimmed" size="sm">
					No cantrips or features saved.
				</Text>
			)}
		</Stack>
	);
}
