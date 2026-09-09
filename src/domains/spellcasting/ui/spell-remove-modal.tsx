import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { CharacterSpellsResponse } from "../../../generated/api-client.generated.js";

interface SpellRemoveModalProps {
	onClose: () => void;
	onConfirm: () => void;
	pending: boolean;
	spell: CharacterSpellsResponse["spells"][number] | null;
	error?: Error | null;
	withinPortal?: boolean;
}

export function SpellRemoveModal({
	onClose,
	onConfirm,
	pending,
	spell,
	error,
	withinPortal = true,
}: SpellRemoveModalProps) {
	return (
		<Modal
			closeButtonProps={{ size: "xl", "aria-label": "Close spell dialog" }}
			centered
			onClose={onClose}
			opened={spell !== null}
			title={spell ? `Remove ${spell.name}?` : "Remove spell?"}
			withinPortal={withinPortal}
		>
			<Stack gap="md">
				{error && (
					<Alert color="red" title="Spell not removed">
						Try removing the spell again.
					</Alert>
				)}
				<Text size="sm">This removes the spell from this character&apos;s spell list.</Text>
				<Group justify="flex-end" gap="xs">
					<Button mih={44} color="gray" disabled={pending} onClick={onClose} variant="default">
						Cancel
					</Button>
					<Button mih={44} c="black" color="red" loading={pending} onClick={onConfirm}>
						Remove spell
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
}
