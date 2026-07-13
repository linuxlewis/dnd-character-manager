import { Button, Group } from "@mantine/core";

export function SpellSlotEditActions({
	disabled,
	defaultsPending,
	isEditing,
	onApplyDefaults,
	onSaveConfiguration,
	updatePending,
}: {
	disabled: boolean;
	defaultsPending: boolean;
	isEditing: boolean;
	onApplyDefaults: () => void;
	onSaveConfiguration: () => void;
	updatePending: boolean;
}) {
	if (!isEditing) return null;

	return (
		<Group gap="xs" wrap="wrap">
			<Button
				color="gray"
				loading={defaultsPending}
				onClick={onApplyDefaults}
				size="xs"
				style={{ flex: "1 1 11rem" }}
				variant="default"
			>
				Apply class defaults
			</Button>
			<Button
				disabled={disabled}
				loading={updatePending}
				onClick={onSaveConfiguration}
				size="xs"
				style={{ flex: "1 1 11rem" }}
				variant="default"
			>
				Apply changes
			</Button>
		</Group>
	);
}
