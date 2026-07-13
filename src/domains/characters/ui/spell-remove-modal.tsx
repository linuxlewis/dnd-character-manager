import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { CharacterSpellsResponse } from "../../../generated/api-client.generated.js";

interface SpellRemoveModalProps {
	onClose: () => void;
	onConfirm: () => void;
	pending: boolean;
	spell: CharacterSpellsResponse["spells"][number] | null;
	withinPortal?: boolean;
}

export function SpellRemoveModal({
	onClose,
	onConfirm,
	pending,
	spell,
	withinPortal = true,
}: SpellRemoveModalProps) {
	return (
		<Modal
			centered
			onClose={onClose}
			opened={spell !== null}
			title={spell ? `Remove ${spell.name}?` : "Remove spell?"}
			withinPortal={withinPortal}
		>
			<Stack gap="md">
				<Text size="sm">This removes the spell from this character&apos;s spell list.</Text>
				<Group justify="flex-end" gap="xs">
					<Button color="gray" disabled={pending} onClick={onClose} variant="default">
						Cancel
					</Button>
					<Button color="red" loading={pending} onClick={onConfirm}>
						Remove spell
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
}
