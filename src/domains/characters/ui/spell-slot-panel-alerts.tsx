import { Alert } from "@mantine/core";

export function SpellSlotPanelAlerts({
	spellSlotsUnavailable,
	spellsUnavailable,
}: {
	spellSlotsUnavailable: boolean;
	spellsUnavailable: boolean;
}) {
	return (
		<>
			{spellSlotsUnavailable && (
				<Alert color="red" title="Spell slots unavailable" variant="light">
					Try the spell slot change again.
				</Alert>
			)}
			{spellsUnavailable && (
				<Alert color="red" title="Spells unavailable" variant="light">
					Try the spell change again.
				</Alert>
			)}
		</>
	);
}
