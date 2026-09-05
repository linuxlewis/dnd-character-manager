import { Alert, Button } from "@mantine/core";

export function SpellSlotPanelAlerts({
	onRetrySpellSlots,
	onRetrySpells,
	spellSlotsUnavailable,
	spellsUnavailable,
}: {
	onRetrySpellSlots: () => void;
	onRetrySpells: () => void;
	spellSlotsUnavailable: boolean;
	spellsUnavailable: boolean;
}) {
	return (
		<>
			{spellSlotsUnavailable && (
				<Alert color="red" title="Spell slots unavailable" variant="light">
					Try the spell slot change again.
					<AlertRetryButton label="Retry spell slots" onClick={onRetrySpellSlots} />
				</Alert>
			)}
			{spellsUnavailable && (
				<Alert color="red" title="Spells unavailable" variant="light">
					Try the spell change again.
					<AlertRetryButton label="Retry spells" onClick={onRetrySpells} />
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
