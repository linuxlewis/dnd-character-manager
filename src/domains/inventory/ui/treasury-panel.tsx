import { Alert, Button, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { TreasuryAddModal } from "./treasury-add-modal.js";
import { TreasuryDisplay } from "./treasury-display.js";
import { getTreasuryErrorMessage } from "./treasury-format.js";
import { TreasurySpendModal } from "./treasury-spend-modal.js";
import type {
	TreasuryAddPreview,
	TreasuryAddRequest,
	TreasuryData,
	TreasurySpendPreview,
	TreasurySpendRequest,
} from "./treasury-types.js";

export interface TreasuryQueryState {
	data?: TreasuryData;
	isLoading: boolean;
	error: Error | null;
	onRetry: () => void;
}

export interface TreasuryOperationState {
	mutationPending: boolean;
	mutationError: Error | null;
	reconciliationPending: boolean;
	reconciliationError: Error | null;
	stalePreviewError: Error | null;
}

export interface TreasuryPanelProps {
	scopeLabel: string;
	query: TreasuryQueryState;
	indeterminateOutcome: {
		message: string;
		onAcknowledge: () => void;
	} | null;
	add: TreasuryOperationState & {
		onConfirm: (
			request: TreasuryAddRequest,
			preview: TreasuryAddPreview,
			onSuccess: () => void,
		) => void;
		onReset: () => void;
		onRetryReconciliation: () => void;
	};
	spend: TreasuryOperationState & {
		onConfirm: (
			request: TreasurySpendRequest,
			preview: TreasurySpendPreview,
			onSuccess: () => void,
		) => void;
		onReset: () => void;
		onRetryReconciliation: () => void;
	};
}

type ActiveDialog = "add" | "spend" | null;

export function TreasuryPanel({
	scopeLabel,
	query,
	indeterminateOutcome,
	add,
	spend,
}: TreasuryPanelProps) {
	const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
	const [dialogVersion, setDialogVersion] = useState(0);
	const treasury = query.data;
	const actionsDisabled = add.mutationPending || spend.mutationPending;
	const reconciliationBlocked = Boolean(add.reconciliationError || spend.reconciliationError);
	const allActionsDisabled =
		actionsDisabled || reconciliationBlocked || indeterminateOutcome !== null;

	function openDialog(dialog: Exclude<ActiveDialog, null>) {
		if (dialog === "add") add.onReset();
		if (dialog === "spend") spend.onReset();
		setDialogVersion((version) => version + 1);
		setActiveDialog(dialog);
	}

	function closeDialog() {
		if (activeDialog === "add" && (add.mutationPending || add.reconciliationError)) return;
		if (activeDialog === "spend" && (spend.mutationPending || spend.reconciliationError)) return;
		setActiveDialog(null);
	}

	function completeDialog() {
		setActiveDialog(null);
	}

	return (
		<Stack gap="md">
			{query.isLoading && (
				<Paper withBorder p="sm">
					<Text c="dimmed">Loading {scopeLabel.toLowerCase()}...</Text>
				</Paper>
			)}
			{query.error && (
				<Alert color="red" title={`${scopeLabel} unavailable`} variant="light">
					{getTreasuryErrorMessage(query.error, "Try loading the treasury again.")}
					<Button mt="sm" onClick={query.onRetry} size="sm" variant="light">
						Retry treasury
					</Button>
				</Alert>
			)}
			{indeterminateOutcome && (
				<Alert color="orange" title="Treasury confirmation could not be verified" variant="light">
					<Stack align="flex-start" gap="sm">
						<Text size="sm">{indeterminateOutcome.message}</Text>
						<Button onClick={indeterminateOutcome.onAcknowledge} size="sm" type="button">
							I reviewed the balance
						</Button>
					</Stack>
				</Alert>
			)}
			{treasury && (
				<TreasuryDisplay
					actionsDisabled={allActionsDisabled}
					onAddFunds={() => openDialog("add")}
					onSpendFunds={() => openDialog("spend")}
					scopeLabel={scopeLabel}
					treasury={treasury}
				/>
			)}

			<TreasuryAddModal
				key={`add-${dialogVersion}`}
				mutationPending={add.mutationPending}
				actionsDisabled={allActionsDisabled}
				mutationError={add.mutationError}
				treasury={treasury}
				onRetryReconciliation={add.onRetryReconciliation}
				onClose={closeDialog}
				onSubmit={(request, preview) => add.onConfirm(request, preview, completeDialog)}
				opened={activeDialog === "add"}
				reconciliationError={add.reconciliationError}
				reconciliationPending={add.reconciliationPending}
				stalePreviewError={add.stalePreviewError}
			/>
			<TreasurySpendModal
				key={`spend-${dialogVersion}`}
				mutationPending={spend.mutationPending}
				actionsDisabled={allActionsDisabled}
				mutationError={spend.mutationError}
				treasury={treasury}
				onRetryReconciliation={spend.onRetryReconciliation}
				onClose={closeDialog}
				onSubmit={(request, preview) => spend.onConfirm(request, preview, completeDialog)}
				opened={activeDialog === "spend"}
				reconciliationError={spend.reconciliationError}
				reconciliationPending={spend.reconciliationPending}
				stalePreviewError={spend.stalePreviewError}
			/>
		</Stack>
	);
}
