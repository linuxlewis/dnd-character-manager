import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { CharacterSpellsResponse } from "../../../generated/api-client.generated.js";

interface SpellRemoveModalProps {
	error?: Error | null;
	onClose: () => void;
	onConfirm: () => void;
	pending: boolean;
	spell: CharacterSpellsResponse["spells"][number] | null;
	withinPortal?: boolean;
}

export function SpellRemoveModal({
	error = null,
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
				{error && (
					<Alert color="red" title="Spell could not be removed" variant="light">
						{error.message} Confirm again to repeat the removal.
					</Alert>
				)}
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
