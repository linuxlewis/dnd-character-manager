import { Alert, Button, Text } from "@mantine/core";

export interface SpellSlotActionError {
	action: string;
	error: Error;
	status?: "ordinary" | "applied" | "safe-to-retry" | "indeterminate" | "reconciliation-failed";
	reconciliationError?: Error;
}

export function SpellSlotPanelAlerts({
	onRetrySpellSlots,
	onRetrySpells,
	onRetryReconciliation,
	onAcknowledgeCurrentSlots,
	reconciliationPending = false,
	spellSlotActionError,
	spellSlotsUnavailable,
	spellsUnavailable,
}: {
	onRetrySpellSlots: () => void;
	onRetrySpells: () => void;
	onRetryReconciliation?: () => void;
	onAcknowledgeCurrentSlots?: () => void;
	reconciliationPending?: boolean;
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
				<SpellSlotActionAlert
					error={spellSlotActionError}
					onAcknowledgeCurrentSlots={onAcknowledgeCurrentSlots}
					onRetryReconciliation={onRetryReconciliation}
					reconciliationPending={reconciliationPending}
				/>
			)}
		</>
	);
}

function SpellSlotActionAlert({
	error,
	onAcknowledgeCurrentSlots,
	onRetryReconciliation,
	reconciliationPending,
}: {
	error: SpellSlotActionError;
	onRetryReconciliation?: () => void;
	onAcknowledgeCurrentSlots?: () => void;
	reconciliationPending: boolean;
}) {
	if (error.status === "applied") {
		return (
			<Alert color="yellow" title="Spell slot action applied" variant="light">
				<Text size="sm">
					{error.action} was applied, but its response was lost. The displayed slot state is
					authoritative; do not repeat this action unless you intend another use.
				</Text>
			</Alert>
		);
	}

	if (error.status === "safe-to-retry") {
		return (
			<Alert color="yellow" title="Spell slot action was not applied" variant="light">
				<Text size="sm">
					The current slot state matches the state before {error.action}. Review the displayed count
					before trying it again.
				</Text>
			</Alert>
		);
	}

	if (error.status === "reconciliation-failed") {
		return (
			<Alert color="red" title="Spell slot state could not be verified" variant="light">
				<Text size="sm">
					{error.action} may have been applied, but the current slot state could not be loaded. Do
					not repeat the action until reconciliation succeeds.
				</Text>
				<Text c="dimmed" size="sm">
					{error.reconciliationError?.message ?? error.error.message} This retry only reads the
					current slots; it does not repeat the action.
				</Text>
				<Button
					disabled={reconciliationPending}
					loading={reconciliationPending}
					mt="sm"
					onClick={onRetryReconciliation}
					type="button"
				>
					Retry spell slot reconciliation
				</Button>
			</Alert>
		);
	}

	if (error.status === "indeterminate") {
		return (
			<Alert color="orange" title="Review the current spell slots" variant="light">
				<Text size="sm">
					The displayed slot state differs from both sides of the attempted change. Review the
					current counts before continuing.
				</Text>
				<Button mt="sm" onClick={onAcknowledgeCurrentSlots} type="button">
					I reviewed the current slots
				</Button>
			</Alert>
		);
	}

	return (
		<Alert color="red" title="Spell slot action failed" variant="light">
			<Text size="sm">Could not complete {error.action}.</Text>
			<Text c="dimmed" size="sm">
				{error.error.message}
			</Text>
		</Alert>
	);
}

function AlertRetryButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<Button mt="sm" onClick={onClick} size="sm" variant="light">
			{label}
		</Button>
	);
}
