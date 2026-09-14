import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CharacterSpellsResponse } from "../../../generated/api-client.generated.js";
import { apiMutations, apiQueryKeys } from "../../../generated/api-client.generated.js";

interface SpellRemoveModalProps {
	characterId: string;
	onClose: () => void;
	spell: CharacterSpellsResponse["spells"][number];
	withinPortal?: boolean;
}

export function SpellRemoveModal({
	onClose,
	characterId,
	spell,
	withinPortal = true,
}: SpellRemoveModalProps) {
	const queryClient = useQueryClient();
	const remove = useMutation({
		...apiMutations.removeCharacterSpell(),
		onSuccess: (response, variables) => {
			queryClient.setQueryData(
				apiQueryKeys.listCharacterSpells({ characterId: variables.characterId }),
				response,
			);
			onClose();
		},
	});
	const pending = remove.isPending;

	return (
		<Modal
			closeButtonProps={{ size: "xl", "aria-label": "Close spell dialog", disabled: pending }}
			centered
			onClose={() => {
				if (!pending) onClose();
			}}
			closeOnEscape={!pending}
			closeOnClickOutside={!pending}
			opened
			title={`Remove ${spell.name}?`}
			withinPortal={withinPortal}
		>
			<Stack gap="md">
				{remove.error && (
					<Alert color="red" title="Spell could not be removed" variant="light">
						Try removing the spell again.
					</Alert>
				)}
				<Text size="sm">This removes the spell from this character&apos;s spell list.</Text>
				<Group justify="flex-end" gap="xs">
					<Button mih={44} color="gray" disabled={pending} onClick={onClose} variant="default">
						Cancel
					</Button>
					<Button
						mih={44}
						c="black"
						color="red"
						loading={pending}
						onClick={() => remove.mutate({ characterId, spellId: spell.id })}
					>
						Remove spell
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
}
