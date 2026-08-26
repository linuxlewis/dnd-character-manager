import { Group, Stack, Text } from "@mantine/core";
import type { CharacterSpellSlotsResponse } from "../../../generated/api-client.generated.js";
import { formatSpellSlotChange } from "./spell-slot-format.js";

interface SpellSlotHistoryProps {
	changes: CharacterSpellSlotsResponse["recentSpellSlotChanges"];
	opened: boolean;
}

export function SpellSlotHistory({ changes, opened }: SpellSlotHistoryProps) {
	if (!opened) return null;

	return (
		<Stack gap="xs">
			{changes.length ? (
				changes.map((change) => (
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
	);
}
