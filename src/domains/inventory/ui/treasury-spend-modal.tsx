import {
	Alert,
	Box,
	Button,
	Group,
	Modal,
	NumberInput,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DND_CURRENCY_TO_COPPER, POSTGRES_INTEGER_MAX } from "../types/index.js";
import {
	getTreasuryErrorMessage,
	TREASURY_DENOMINATIONS,
	type TreasuryDenomination,
} from "./treasury-format.js";
import { TreasuryPreview } from "./treasury-preview.js";
import type { TreasuryData, TreasurySpendPreview, TreasurySpendRequest } from "./treasury-types.js";
import {
	createTreasuryNeutralPreview,
	createTreasurySpendPreview,
	normalizeTreasuryNote,
} from "./treasury-types.js";

type NumberDraft = "" | number;

type SpendFundsDenominationValues = Record<TreasuryDenomination, NumberDraft>;
export type SpendFundsValues = SpendFundsDenominationValues & { note: string };
type SpendFundsInputValues = SpendFundsDenominationValues & { note?: string };

const initialValues: SpendFundsValues = { cp: "", sp: "", gp: "", pp: "", note: "" };

export function TreasurySpendModal({
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
	initialValues?: SpendFundsInputValues;
	treasury?: TreasuryData;
	mutationError: Error | null;
	mutationPending: boolean;
	actionsDisabled?: boolean;
	reconciliationPending?: boolean;
	reconciliationError?: Error | null;
	stalePreviewError?: Error | null;
	onRetryReconciliation?: () => void;
	onClose: () => void;
	onSubmit: (request: TreasurySpendRequest, preview: TreasurySpendPreview) => void;
}) {
	const form = useForm<SpendFundsValues>({
		mode: "controlled",
		initialValues: { ...initialValues, ...providedInitialValues },
		validate: validateSpendFunds,
	});
	const currentRequest = toSpendTreasuryRequest(form.values);
	const draftIsValid = isValidDraft(form.values);
	const draftIsNeutral = isNeutralDraft(form.values);
	const preview = treasury
		? draftIsNeutral
			? createTreasuryNeutralPreview(treasury, "spend")
			: draftIsValid && currentRequest
				? createTreasurySpendPreview(treasury, { amount: currentRequest.amount })
				: null
		: null;
	const previewError =
		treasury && !draftIsNeutral && (!draftIsValid || currentRequest === null)
			? getDraftError(form.values)
			: undefined;
	const formDisabled = actionsDisabled || mutationPending || reconciliationPending;
	const submitDisabled =
		formDisabled ||
		treasury === undefined ||
		currentRequest === null ||
		!draftIsValid ||
		preview?.canApply === false;

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
				onSubmit={form.onSubmit(() => {
					if (draftIsValid && currentRequest && preview?.canApply) {
						onSubmit(currentRequest, preview);
					}
				})}
			>
				<Stack gap="md">
					<SimpleGrid cols={{ base: 2, xs: 2 }} spacing="sm">
						{TREASURY_DENOMINATIONS.map(({ key, label }, index) => (
							<Box key={key}>
								<NumberInput
									{...form.getInputProps(key)}
									allowDecimal={false}
									allowNegative={false}
									data-autofocus={index === 0 || undefined}
									disabled={formDisabled}
									hideControls
									label={`${label} (${key.toUpperCase()})`}
									max={POSTGRES_INTEGER_MAX}
									min={0}
									styles={{ input: { fontSize: "16px" } }}
								/>
								<Text c="dimmed" size="xs">
									Available: {treasury?.balances[key] ?? 0}
								</Text>
							</Box>
						))}
					</SimpleGrid>

					<TextInput
						{...form.getInputProps("note")}
						disabled={formDisabled}
						label="Note (optional)"
						maxLength={500}
					/>

					{stalePreviewError && (
						<Alert color="orange" title="Treasury changed before save" variant="light">
							{stalePreviewError.message}
						</Alert>
					)}
					{mutationError && (
						<Alert color="red" title="Spend failed" variant="light">
							{getTreasuryErrorMessage(
								mutationError,
								"The spend operation could not be completed.",
							)}
						</Alert>
					)}

					{treasury && (
						<TreasuryPreview errorMessage={previewError} preview={preview ?? undefined} />
					)}

					{reconciliationError && (
						<Alert color="red" title="Treasury reconciliation failed" variant="light">
							{getTreasuryErrorMessage(
								reconciliationError,
								"The treasury could not be reconciled after the spend attempt.",
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
							Spend
						</Button>
					</Group>
				</Stack>
			</Box>
		</Modal>
	);
}

export function validateSpendFunds(values: SpendFundsInputValues) {
	const errors: Partial<Record<TreasuryDenomination | "note", string>> = {};
	for (const { key } of TREASURY_DENOMINATIONS) {
		const value = values[key];
		if (value !== "" && (!Number.isInteger(value) || value < 0 || value > POSTGRES_INTEGER_MAX)) {
			errors[key] = "Enter a nonnegative whole number within the supported limit.";
		}
	}
	if (Object.values(values).every((value) => value === 0 || value === "")) {
		errors.cp ??= "Spend at least one coin.";
	}
	if (toSpendTreasuryRequest(values) === null && Object.keys(errors).length === 0) {
		errors.cp = "The total spend is too large to process.";
	}
	if (typeof values.note === "string" && values.note.length > 500) {
		errors.note = "Keep the note to 500 characters or fewer.";
	}
	return errors;
}

export function toSpendTreasuryRequest(values: SpendFundsInputValues): TreasurySpendRequest | null {
	const totalCopper = TREASURY_DENOMINATIONS.reduce(
		(total, { key }) => total + toNumber(values[key]) * DND_CURRENCY_TO_COPPER[key],
		0,
	);
	if (!Number.isSafeInteger(totalCopper) || totalCopper < 1) return null;

	for (const { key } of TREASURY_DENOMINATIONS) {
		if (totalCopper % DND_CURRENCY_TO_COPPER[key] !== 0) continue;
		const amount = totalCopper / DND_CURRENCY_TO_COPPER[key];
		if (amount <= POSTGRES_INTEGER_MAX) {
			return { amount: { denomination: key, amount }, note: normalizeTreasuryNote(values.note) };
		}
	}
	return null;
}

function toNumber(value: NumberDraft) {
	return value === "" ? 0 : value;
}

function isValidDraft(values: SpendFundsValues) {
	return (
		TREASURY_DENOMINATIONS.every(({ key }) => {
			const value = values[key];
			return (
				value === "" || (Number.isInteger(value) && value >= 0 && value <= POSTGRES_INTEGER_MAX)
			);
		}) &&
		TREASURY_DENOMINATIONS.some(({ key }) => {
			const value = values[key];
			return typeof value === "number" && value > 0;
		}) &&
		(values.note?.length ?? 0) <= 500
	);
}

function isNeutralDraft(values: SpendFundsValues) {
	return TREASURY_DENOMINATIONS.every(({ key }) => values[key] === 0 || values[key] === "");
}

function getDraftError(values: SpendFundsValues) {
	return (
		Object.values(validateSpendFunds(values))[0] ??
		"Enter a valid positive amount to calculate the change."
	);
}
