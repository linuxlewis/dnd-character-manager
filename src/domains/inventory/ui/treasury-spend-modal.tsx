import { Alert, Box, Button, Group, Modal, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import type {
	SpendCharacterTreasuryPreviewResponse,
	SpendCharacterTreasuryRequest,
} from "../../../generated/api-client.generated.js";
import {
	getTreasuryErrorMessage,
	TREASURY_DENOMINATIONS,
	type TreasuryDenomination,
} from "./treasury-format.js";
import { TreasuryPreview } from "./treasury-preview.js";

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
	onClose,
	onPreview,
	onConfirm,
}: {
	opened: boolean;
	initialValues?: SpendFundsValues;
	preview: SpendCharacterTreasuryPreviewResponse | null;
	previewRequest: SpendCharacterTreasuryRequest | null;
	previewPending: boolean;
	previewError: Error | null;
	mutationError: Error | null;
	confirmPending: boolean;
	onClose: () => void;
	onPreview: (request: SpendCharacterTreasuryRequest) => void;
	onConfirm: (request: SpendCharacterTreasuryRequest) => void;
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
						label="Denomination"
						withAsterisk
					/>
					<NumberInput
						{...form.getInputProps("amount")}
						allowDecimal={false}
						allowNegative={false}
						data-autofocus
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
					{mutationError && (
						<Alert color="red" title="Spend funds failed" variant="light">
							{getTreasuryErrorMessage(mutationError, "The funds could not be spent.")}
						</Alert>
					)}

					{visiblePreview && currentRequest && (
						<TreasuryPreview
							confirmDisabled={confirmPending}
							confirmLabel="Confirm spend"
							onConfirm={() => onConfirm(currentRequest)}
							preview={visiblePreview.preview}
							returnedChange={visiblePreview.preview.change}
						/>
					)}

					<Group justify="flex-end">
						<Button
							disabled={previewPending || confirmPending}
							onClick={onClose}
							type="button"
							variant="default"
						>
							Cancel
						</Button>
						<Button loading={previewPending} type="submit">
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

export function toSpendTreasuryRequest(
	values: SpendFundsValues,
): SpendCharacterTreasuryRequest | null {
	if (values.denomination === "" || typeof values.amount !== "number") return null;
	return { amount: { denomination: values.denomination, amount: values.amount } };
}

function sameRequest(left: SpendCharacterTreasuryRequest, right: SpendCharacterTreasuryRequest) {
	return (
		left.amount.denomination === right.amount.denomination &&
		left.amount.amount === right.amount.amount
	);
}
