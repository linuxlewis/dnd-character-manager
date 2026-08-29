import { Alert, Box, Button, Group, Modal, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import {
	getTreasuryErrorMessage,
	TREASURY_DENOMINATIONS,
	type TreasuryDenomination,
} from "./treasury-format.js";
import { TreasuryPreview } from "./treasury-preview.js";
import type { TreasurySpendPreview, TreasurySpendRequest } from "./treasury-types.js";

type NumberDraft = "" | number;

export interface SpendFundsValues {
	amount: NumberDraft;
	denomination: TreasuryDenomination | "";
}

const initialValues: SpendFundsValues = { amount: "", denomination: "gp" };
const denominationOptions = TREASURY_DENOMINATIONS.map(({ key, label }) => ({
	value: key,
	label: `${label} (${key.toUpperCase()})`,
}));

export function TreasurySpendModal({
	opened,
	initialValues: providedInitialValues,
	preview,
	previewRequest,
	previewPending,
	previewError,
	mutationError,
	confirmPending,
	actionsDisabled = false,
	reconciliationPending = false,
	reconciliationError = null,
	stalePreviewError = null,
	onRetryReconciliation = () => {},
	onClose,
	onPreview,
	onConfirm,
}: {
	opened: boolean;
	initialValues?: SpendFundsValues;
	preview: TreasurySpendPreview | null;
	previewRequest: TreasurySpendRequest | null;
	previewPending: boolean;
	previewError: Error | null;
	mutationError: Error | null;
	confirmPending: boolean;
	actionsDisabled?: boolean;
	reconciliationPending?: boolean;
	reconciliationError?: Error | null;
	stalePreviewError?: Error | null;
	onRetryReconciliation?: () => void;
	onClose: () => void;
	onPreview: (request: TreasurySpendRequest) => void;
	onConfirm: (request: TreasurySpendRequest, preview: TreasurySpendPreview) => void;
}) {
	const form = useForm<SpendFundsValues>({
		mode: "controlled",
		initialValues: providedInitialValues ?? initialValues,
		validate: validateSpendFunds,
	});
	const currentRequest = toSpendTreasuryRequest(form.values);
	const previewIsCurrent =
		currentRequest !== null &&
		preview !== null &&
		previewRequest !== null &&
		sameRequest(currentRequest, previewRequest);
	const visiblePreview = previewIsCurrent ? preview : null;
	const formDisabled = actionsDisabled || previewPending || confirmPending;

	return (
		<Modal
			closeButtonProps={{ "aria-label": "Close spend funds dialog", size: "xl" }}
			onClose={onClose}
			opened={opened}
			size="md"
			styles={{
				content: { maxWidth: "calc(100vw - 2rem)" },
				inner: { left: 0, padding: 0, right: 0 },
			}}
			title="Spend funds"
			withinPortal={false}
		>
			<Box
				component="form"
				onSubmit={form.onSubmit((values) => {
					const request = toSpendTreasuryRequest(values);
					if (request) onPreview(request);
				})}
			>
				<Stack gap="md">
					<Text c="dimmed" size="sm">
						Choose the price denomination and enter a positive whole number.
					</Text>
					<Select
						{...form.getInputProps("denomination")}
						data={denominationOptions}
						disabled={formDisabled}
						label="Denomination"
						withAsterisk
					/>
					<NumberInput
						{...form.getInputProps("amount")}
						allowDecimal={false}
						allowNegative={false}
						data-autofocus
						disabled={formDisabled}
						hideControls
						label="Amount"
						min={1}
						styles={{ input: { fontSize: "16px" } }}
						withAsterisk
					/>

					{previewError && (
						<Alert color="red" title="Spend preview failed" variant="light">
							{getTreasuryErrorMessage(previewError, "The spend preview could not be loaded.")}
						</Alert>
					)}
					{stalePreviewError && (
						<Alert color="orange" title="Treasury changed since preview" variant="light">
							{stalePreviewError.message}
						</Alert>
					)}
					{mutationError && (
						<Alert color="orange" title="Spend confirmation response unavailable" variant="light">
							{getTreasuryErrorMessage(
								mutationError,
								"The spend confirmation response could not be verified.",
							)}
						</Alert>
					)}

					{visiblePreview && currentRequest && (
						<TreasuryPreview
							confirmDisabled={formDisabled}
							confirmLoading={confirmPending}
							confirmLabel="Confirm spend"
							onConfirm={() => onConfirm(currentRequest, visiblePreview)}
							preview={visiblePreview}
							returnedChange={visiblePreview.change}
						/>
					)}

					{reconciliationError && (
						<Alert color="red" title="Treasury reconciliation failed" variant="light">
							{getTreasuryErrorMessage(
								reconciliationError,
								"The treasury could not be reconciled after the confirmation attempt.",
							)}
							<Button
								disabled={reconciliationPending}
								loading={reconciliationPending}
								mt="sm"
								onClick={onRetryReconciliation}
								type="button"
							>
								Retry treasury reconciliation
							</Button>
						</Alert>
					)}

					<Group justify="flex-end">
						<Button disabled={formDisabled} onClick={onClose} type="button" variant="default">
							Cancel
						</Button>
						<Button disabled={formDisabled} loading={previewPending} type="submit">
							{visiblePreview ? "Preview again" : "Preview spend"}
						</Button>
					</Group>
				</Stack>
			</Box>
		</Modal>
	);
}

export function validateSpendFunds(values: SpendFundsValues) {
	return {
		amount:
			typeof values.amount !== "number" || !Number.isInteger(values.amount) || values.amount < 1
				? "Enter a positive whole number."
				: null,
		denomination: values.denomination === "" ? "Choose a denomination." : null,
	};
}

export function toSpendTreasuryRequest(values: SpendFundsValues): TreasurySpendRequest | null {
	if (values.denomination === "" || typeof values.amount !== "number") return null;
	return { amount: { denomination: values.denomination, amount: values.amount } };
}

function sameRequest(left: TreasurySpendRequest, right: TreasurySpendRequest) {
	return (
		left.amount.denomination === right.amount.denomination &&
		left.amount.amount === right.amount.amount
	);
}
