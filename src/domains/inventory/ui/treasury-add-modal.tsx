import { Alert, Box, Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import {
	getTreasuryErrorMessage,
	TREASURY_DENOMINATIONS,
	type TreasuryDenomination,
} from "./treasury-format.js";
import { TreasuryPreview } from "./treasury-preview.js";
import type { TreasuryAddPreview, TreasuryAddRequest } from "./treasury-types.js";

export type TreasuryNumberDraft = "" | number;
export type AddFundsValues = Record<TreasuryDenomination, TreasuryNumberDraft>;

const initialValues: AddFundsValues = { cp: "", sp: "", gp: "", pp: "" };

export function TreasuryAddModal({
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
	initialValues?: AddFundsValues;
	preview: TreasuryAddPreview | null;
	previewRequest: TreasuryAddRequest | null;
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
	onPreview: (request: TreasuryAddRequest) => void;
	onConfirm: (request: TreasuryAddRequest, preview: TreasuryAddPreview) => void;
}) {
	const form = useForm<AddFundsValues>({
		mode: "controlled",
		initialValues: providedInitialValues ?? initialValues,
		validate: validateAddFunds,
	});
	const currentRequest = toAddTreasuryRequest(form.values);
	const validDraft = isValidDraft(form.values);
	const previewIsCurrent =
		validDraft &&
		preview !== null &&
		previewRequest !== null &&
		sameRequest(currentRequest, previewRequest);
	const visiblePreview = previewIsCurrent ? preview : null;
	const formDisabled = actionsDisabled || previewPending || confirmPending;

	return (
		<Modal
			closeButtonProps={{ "aria-label": "Close add funds dialog", size: "xl" }}
			onClose={onClose}
			opened={opened}
			size="md"
			styles={{
				content: { maxWidth: "calc(100vw - 2rem)" },
				inner: { left: 0, padding: 0, right: 0 },
			}}
			title="Add funds"
			withinPortal={false}
		>
			<Box
				component="form"
				onSubmit={form.onSubmit((values) => onPreview(toAddTreasuryRequest(values)))}
			>
				<Stack gap="md">
					<Text c="dimmed" size="sm">
						Enter nonnegative whole numbers. At least one denomination must be greater than zero.
					</Text>
					{TREASURY_DENOMINATIONS.map(({ key, label }, index) => (
						<NumberInput
							{...form.getInputProps(key)}
							allowDecimal={false}
							allowNegative={false}
							data-autofocus={index === 0 || undefined}
							disabled={formDisabled}
							hideControls
							key={key}
							label={`${label} (${key.toUpperCase()})`}
							min={0}
							styles={{ input: { fontSize: "16px" } }}
						/>
					))}

					{previewError && (
						<Alert color="red" title="Add preview failed" variant="light">
							{getTreasuryErrorMessage(previewError, "The add preview could not be loaded.")}
						</Alert>
					)}
					{stalePreviewError && (
						<Alert color="orange" title="Treasury changed since preview" variant="light">
							{stalePreviewError.message}
						</Alert>
					)}
					{mutationError && (
						<Alert color="orange" title="Add confirmation response unavailable" variant="light">
							{getTreasuryErrorMessage(
								mutationError,
								"The add confirmation response could not be verified.",
							)}
						</Alert>
					)}

					{visiblePreview && (
						<TreasuryPreview
							confirmDisabled={formDisabled}
							confirmLoading={confirmPending}
							confirmLabel="Confirm add funds"
							onConfirm={() => onConfirm(currentRequest, visiblePreview)}
							preview={visiblePreview}
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
							{visiblePreview ? "Preview again" : "Preview add"}
						</Button>
					</Group>
				</Stack>
			</Box>
		</Modal>
	);
}

export function validateAddFunds(values: AddFundsValues) {
	const errors: Partial<Record<TreasuryDenomination, string>> = {};
	for (const { key } of TREASURY_DENOMINATIONS) {
		const value = values[key];
		if (value !== "" && (!Number.isInteger(value) || value < 0)) {
			errors[key] = "Enter a nonnegative whole number.";
		}
	}
	if (Object.values(values).every((value) => value === 0 || value === "")) {
		errors.cp ??= "Add at least one coin.";
	}
	return errors;
}

export function toAddTreasuryRequest(values: AddFundsValues): TreasuryAddRequest {
	return {
		delta: {
			cp: toNumber(values.cp),
			sp: toNumber(values.sp),
			gp: toNumber(values.gp),
			pp: toNumber(values.pp),
		},
	};
}

function toNumber(value: TreasuryNumberDraft) {
	return value === "" ? 0 : value;
}

function isValidDraft(values: AddFundsValues) {
	return (
		Object.values(values).every(
			(value) => value === "" || (Number.isInteger(value) && value >= 0),
		) && Object.values(values).some((value) => typeof value === "number" && value > 0)
	);
}

function sameRequest(left: TreasuryAddRequest, right: TreasuryAddRequest) {
	return (
		left.delta.cp === right.delta.cp &&
		left.delta.sp === right.delta.sp &&
		left.delta.gp === right.delta.gp &&
		left.delta.pp === right.delta.pp
	);
}
