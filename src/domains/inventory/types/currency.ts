import { z } from "zod";
import {
	NonNegativeSafeIntegerSchema,
	POSTGRES_INTEGER_MAX,
	PositivePostgresIntegerSchema,
	PostgresIntegerSchema,
	PostgresNonNegativeIntegerSchema,
	SafeIntegerSchema,
} from "./numeric.js";

export const CURRENCY_DENOMINATIONS = ["cp", "sp", "gp", "pp"] as const;

export const CurrencyDenominationSchema = z.enum(CURRENCY_DENOMINATIONS);
export type CurrencyDenomination = z.infer<typeof CurrencyDenominationSchema>;

export const CurrencyNoteSchema = z
	.string()
	.nullable()
	.transform((value) => {
		if (value === null) return null;
		const note = value.trim();
		return note.length > 0 ? note : null;
	})
	.pipe(z.string().max(500).nullable());
export type CurrencyNote = z.output<typeof CurrencyNoteSchema>;

export const DND_CURRENCY_TO_COPPER = {
	cp: 1,
	sp: 10,
	gp: 100,
	pp: 1_000,
} as const satisfies Record<CurrencyDenomination, number>;

export const CurrencyAmountSchema = z
	.object({
		denomination: CurrencyDenominationSchema,
		amount: PositivePostgresIntegerSchema,
	})
	.strict();
export type CurrencyAmount = z.infer<typeof CurrencyAmountSchema>;

export const CurrencyBalanceSchema = z
	.object({
		cp: PostgresNonNegativeIntegerSchema,
		sp: PostgresNonNegativeIntegerSchema,
		gp: PostgresNonNegativeIntegerSchema,
		pp: PostgresNonNegativeIntegerSchema,
	})
	.strict();
export type CurrencyBalance = z.infer<typeof CurrencyBalanceSchema>;

export const CurrencyDeltaSchema = z
	.object({
		cp: PostgresIntegerSchema,
		sp: PostgresIntegerSchema,
		gp: PostgresIntegerSchema,
		pp: PostgresIntegerSchema,
	})
	.strict();
export type CurrencyDelta = z.infer<typeof CurrencyDeltaSchema>;

export const CurrencyTotalValueSchema = z
	.object({
		copper: NonNegativeSafeIntegerSchema,
		gp: z.number().nonnegative().finite(),
	})
	.strict()
	.refine((value) => value.gp === value.copper / DND_CURRENCY_TO_COPPER.gp, {
		message: "Total GP value must match the total copper value.",
		path: ["gp"],
	});
export type CurrencyTotalValue = z.infer<typeof CurrencyTotalValueSchema>;

export const CurrencyOperationSchema = z.enum(["add", "spend", "convert"]);
export type CurrencyOperation = z.infer<typeof CurrencyOperationSchema>;

export const InsufficientFundsErrorSchema = z
	.object({
		code: z.literal("INSUFFICIENT_FUNDS"),
		message: z.string().min(1).max(240),
		available: CurrencyTotalValueSchema,
		requested: CurrencyTotalValueSchema,
	})
	.strict();
export type InsufficientFundsError = z.infer<typeof InsufficientFundsErrorSchema>;

export const InsufficientFundsResponseSchema = z
	.object({
		error: InsufficientFundsErrorSchema,
	})
	.strict();
export type InsufficientFundsResponse = z.infer<typeof InsufficientFundsResponseSchema>;

export const TreasuryConflictErrorSchema = z
	.object({
		code: z.literal("TREASURY_CONFLICT"),
		message: z.string().min(1).max(240),
		expectedPrevious: CurrencyBalanceSchema,
		actualPrevious: CurrencyBalanceSchema,
	})
	.strict();
export type TreasuryConflictError = z.infer<typeof TreasuryConflictErrorSchema>;

export const TreasuryConflictResponseSchema = z
	.object({ error: TreasuryConflictErrorSchema })
	.strict();
export type TreasuryConflictResponse = z.infer<typeof TreasuryConflictResponseSchema>;

export const TreasurySpendErrorResponseSchema = z.union([
	InsufficientFundsResponseSchema,
	TreasuryConflictResponseSchema,
]);
export type TreasurySpendErrorResponse = z.infer<typeof TreasurySpendErrorResponseSchema>;

export const InsufficientDenominationErrorSchema = z
	.object({
		code: z.literal("INSUFFICIENT_DENOMINATION"),
		message: z.string().min(1).max(240),
		denomination: CurrencyDenominationSchema,
		available: PostgresNonNegativeIntegerSchema,
		requested: PositivePostgresIntegerSchema,
	})
	.strict();
export type InsufficientDenominationError = z.infer<typeof InsufficientDenominationErrorSchema>;

export const InsufficientDenominationResponseSchema = z
	.object({
		error: InsufficientDenominationErrorSchema,
	})
	.strict();
export type InsufficientDenominationResponse = z.infer<
	typeof InsufficientDenominationResponseSchema
>;

export const CurrencyAddRequestSchema = z
	.object({ delta: CurrencyDeltaSchema })
	.strict()
	.refine((request) => hasAddableDelta(request.delta), {
		message: "An add request must contain only nonnegative values and at least one positive value.",
		path: ["delta"],
	});
export type CurrencyAddRequest = z.infer<typeof CurrencyAddRequestSchema>;

export const CurrencySpendRequestSchema = z
	.object({
		amount: CurrencyAmountSchema,
	})
	.strict();
export type CurrencySpendRequest = z.infer<typeof CurrencySpendRequestSchema>;

export const CurrencyConversionRequestSchema = z
	.object({
		from: CurrencyDenominationSchema,
		to: CurrencyDenominationSchema,
		amount: PositivePostgresIntegerSchema,
	})
	.strict()
	.refine((request) => request.from !== request.to, {
		message: "A currency conversion must change denomination.",
		path: ["to"],
	})
	.refine(
		(request) =>
			(request.amount * DND_CURRENCY_TO_COPPER[request.from]) %
				DND_CURRENCY_TO_COPPER[request.to] ===
			0,
		{
			message: "A conversion must produce a whole number of target-denomination coins.",
			path: ["amount"],
		},
	)
	.refine(
		(request) =>
			(request.amount * DND_CURRENCY_TO_COPPER[request.from]) /
				DND_CURRENCY_TO_COPPER[request.to] <=
			POSTGRES_INTEGER_MAX,
		{
			message: "A conversion must fit the PostgreSQL integer target balance.",
			path: ["amount"],
		},
	);
export type CurrencyConversionRequest = z.infer<typeof CurrencyConversionRequestSchema>;

export const CurrencyApplyDeltaRequestSchema = z
	.object({
		delta: CurrencyDeltaSchema,
	})
	.strict();
export type CurrencyApplyDeltaRequest = z.infer<typeof CurrencyApplyDeltaRequestSchema>;

export const CurrencyMutationResponseSchema = z
	.object({
		operation: CurrencyOperationSchema,
		previous: CurrencyBalanceSchema,
		next: CurrencyBalanceSchema,
		delta: CurrencyDeltaSchema,
		totalValue: CurrencyTotalValueSchema,
	})
	.strict();
export type CurrencyMutationResponse = z.infer<typeof CurrencyMutationResponseSchema>;

export const CurrencyAddResponseSchema = CurrencyMutationResponseSchema.extend({
	operation: z.literal("add"),
}).strict();
export type CurrencyAddResponse = z.infer<typeof CurrencyAddResponseSchema>;

export const CurrencySpendResponseSchema = CurrencyMutationResponseSchema.extend({
	operation: z.literal("spend"),
	spent: CurrencyAmountSchema,
	change: CurrencyBalanceSchema.optional(),
}).strict();
export type CurrencySpendResponse = z.infer<typeof CurrencySpendResponseSchema>;

export const CurrencyConversionResponseSchema = CurrencyMutationResponseSchema.extend({
	operation: z.literal("convert"),
	from: CurrencyDenominationSchema,
	to: CurrencyDenominationSchema,
	amount: PositivePostgresIntegerSchema,
	convertedAmount: PositivePostgresIntegerSchema,
}).strict();
export type CurrencyConversionResponse = z.infer<typeof CurrencyConversionResponseSchema>;

export const CurrencyPreviewSchema = z
	.object({
		operation: CurrencyOperationSchema,
		previous: CurrencyBalanceSchema,
		next: CurrencyBalanceSchema,
		delta: CurrencyDeltaSchema,
		totalValue: CurrencyTotalValueSchema,
		canApply: z.boolean(),
		change: CurrencyBalanceSchema.optional(),
		error: InsufficientFundsErrorSchema.optional(),
	})
	.strict();
export type CurrencyPreview = z.infer<typeof CurrencyPreviewSchema>;

export function getCurrencyValueInCopper(balance: CurrencyBalance): number {
	const parsed = CurrencyBalanceSchema.parse(balance);
	const copper = CURRENCY_DENOMINATIONS.reduce(
		(total, denomination) => total + parsed[denomination] * DND_CURRENCY_TO_COPPER[denomination],
		0,
	);
	return SafeIntegerSchema.parse(copper);
}

export function getCurrencyDeltaValueInCopper(delta: CurrencyDelta): number {
	const parsed = CurrencyDeltaSchema.parse(delta);
	const copper = CURRENCY_DENOMINATIONS.reduce(
		(total, denomination) => total + parsed[denomination] * DND_CURRENCY_TO_COPPER[denomination],
		0,
	);
	return SafeIntegerSchema.parse(copper);
}

export function getCurrencyTotalValue(balance: CurrencyBalance): CurrencyTotalValue {
	const copper = getCurrencyValueInCopper(balance);
	return CurrencyTotalValueSchema.parse({ copper, gp: copper / DND_CURRENCY_TO_COPPER.gp });
}

export function convertDenominationAmount(
	amount: number,
	from: CurrencyDenomination,
	to: CurrencyDenomination,
): number {
	const request = CurrencyConversionRequestSchema.parse({ amount, from, to });
	const convertedAmount =
		(request.amount * DND_CURRENCY_TO_COPPER[request.from]) / DND_CURRENCY_TO_COPPER[request.to];
	return PositivePostgresIntegerSchema.parse(convertedAmount);
}

function hasAddableDelta(delta: CurrencyDelta) {
	return (
		CURRENCY_DENOMINATIONS.every((denomination) => delta[denomination] >= 0) &&
		CURRENCY_DENOMINATIONS.some((denomination) => delta[denomination] > 0)
	);
}
