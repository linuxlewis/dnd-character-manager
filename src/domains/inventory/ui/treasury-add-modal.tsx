import { Alert, Box, Button, Group, Modal, NumberInput, SimpleGrid, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { POSTGRES_INTEGER_MAX } from "../types/index.js";
import {
	getTreasuryErrorMessage,
	TREASURY_DENOMINATIONS,
	type TreasuryDenomination,
} from "./treasury-format.js";
import { TreasuryPreview } from "./treasury-preview.js";
import type { TreasuryAddPreview, TreasuryAddRequest, TreasuryData } from "./treasury-types.js";
import { createTreasuryAddPreview } from "./treasury-types.js";

export type TreasuryNumberDraft = "" | number;
export type AddFundsValues = Record<TreasuryDenomination, TreasuryNumberDraft>;

const initialValues: AddFundsValues = { cp: "", sp: "", gp: "", pp: "" };

export function TreasuryAddModal({
	opened,
	initialValues: providedInitialValues,
	treasury,
	mutationError,
	mutationPending,
	actionsDisabled = false,
	reconciliationPending = false,
	reconciliationError = null,
	stalePreviewError = null,
	onRetryReconciliation = () => {},
	onClose,
	onSubmit,
}: {
	opened: boolean;
	initialValues?: AddFundsValues;
	treasury?: TreasuryData;
	mutationError: Error | null;
	mutationPending: boolean;
	actionsDisabled?: boolean;
	reconciliationPending?: boolean;
	reconciliationError?: Error | null;
	stalePreviewError?: Error | null;
	onRetryReconciliation?: () => void;
	onClose: () => void;
	onSubmit: (request: TreasuryAddRequest, preview: TreasuryAddPreview) => void;
}) {
	const form = useForm<AddFundsValues>({
		mode: "controlled",
		initialValues: providedInitialValues ?? initialValues,
		validate: validateAddFunds,
	});
	const currentRequest = toAddTreasuryRequest(form.values);
	const draftIsValid = isValidDraft(form.values);
	const preview =
		treasury && draftIsValid ? createTreasuryAddPreview(treasury, currentRequest) : null;
	const formDisabled = actionsDisabled || mutationPending || reconciliationPending;
	const submitDisabled = formDisabled || treasury === undefined || preview?.canApply === false;

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
				onSubmit={form.onSubmit(() => {
					if (preview?.canApply) onSubmit(currentRequest, preview);
				})}
			>
				<Stack gap="md">
					<SimpleGrid cols={{ base: 2, xs: 2 }} spacing="sm">
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
								max={POSTGRES_INTEGER_MAX}
								min={0}
								styles={{ input: { fontSize: "16px" } }}
							/>
						))}
					</SimpleGrid>

					{stalePreviewError && (
						<Alert color="orange" title="Treasury changed before save" variant="light">
							{stalePreviewError.message}
						</Alert>
					)}
					{mutationError && (
						<Alert color="red" title="Add funds failed" variant="light">
							{getTreasuryErrorMessage(mutationError, "The add operation could not be completed.")}
						</Alert>
					)}

					{preview && <TreasuryPreview preview={preview} />}

					{reconciliationError && (
						<Alert color="red" title="Treasury reconciliation failed" variant="light">
							{getTreasuryErrorMessage(
								reconciliationError,
								"The treasury could not be reconciled after the add attempt.",
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
						<Button disabled={submitDisabled} loading={mutationPending} type="submit">
							Add funds
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
		if (value !== "" && (!Number.isInteger(value) || value < 0 || value > POSTGRES_INTEGER_MAX)) {
			errors[key] = "Enter a nonnegative whole number within the supported limit.";
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
			(value) =>
				value === "" || (Number.isInteger(value) && value >= 0 && value <= POSTGRES_INTEGER_MAX),
		) && Object.values(values).some((value) => typeof value === "number" && value > 0)
	);
}
