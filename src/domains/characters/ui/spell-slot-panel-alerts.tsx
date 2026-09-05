import { Alert, Button, Text } from "@mantine/core";

export interface SpellSlotActionError {
	action: string;
	error: Error;
}

export function SpellSlotPanelAlerts({
	onRetrySpellSlots,
	onRetrySpells,
	spellSlotActionError,
	spellSlotsUnavailable,
	spellsUnavailable,
}: {
	onRetrySpellSlots: () => void;
	onRetrySpells: () => void;
	spellSlotActionError?: SpellSlotActionError | null;
	spellSlotsUnavailable: boolean;
	spellsUnavailable: boolean;
}) {
	return (
		<>
			{spellSlotsUnavailable && (
				<Alert color="red" title="Spell slots unavailable" variant="light">
					Could not load the saved spell slots.
					<AlertRetryButton label="Retry spell slots" onClick={onRetrySpellSlots} />
				</Alert>
			)}
			{spellsUnavailable && (
				<Alert color="red" title="Spells unavailable" variant="light">
					Could not load the saved spells.
					<AlertRetryButton label="Retry spells" onClick={onRetrySpells} />
				</Alert>
			)}
			{spellSlotActionError && (
				<Alert color="red" title="Spell slot action failed" variant="light">
					<Text size="sm">Could not complete {spellSlotActionError.action}.</Text>
					<Text c="dimmed" size="sm">
						{spellSlotActionError.error.message} You can repeat the original action from its
						control.
					</Text>
				</Alert>
			)}
		</>
	);
}

function AlertRetryButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<Button mt="sm" onClick={onClick} size="sm" variant="light">
			{label}
		</Button>
	);
}
