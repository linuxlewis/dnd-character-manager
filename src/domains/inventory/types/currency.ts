import { z } from "zod";

export const CurrencyDenominationSchema = z.enum(["cp", "sp", "gp", "pp"]);
export type CurrencyDenomination = z.infer<typeof CurrencyDenominationSchema>;

export const CURRENCY_DENOMINATIONS = ["cp", "sp", "gp", "pp"] as const;

export const DND_CURRENCY_TO_COPPER = {
	cp: 1,
	sp: 10,
	gp: 100,
	pp: 1_000,
} as const satisfies Record<CurrencyDenomination, number>;

const MAX_CURRENCY_INTEGER = Number.MAX_SAFE_INTEGER;
const NonNegativeCurrencyIntegerSchema = z.number().int().nonnegative().max(MAX_CURRENCY_INTEGER);
const SignedCurrencyIntegerSchema = z
	.number()
	.int()
	.min(-MAX_CURRENCY_INTEGER)
	.max(MAX_CURRENCY_INTEGER);
const PositiveCurrencyIntegerSchema = z.number().int().positive().max(MAX_CURRENCY_INTEGER);

export const CurrencyAmountSchema = z.object({
	denomination: CurrencyDenominationSchema,
	amount: PositiveCurrencyIntegerSchema,
});
export type CurrencyAmount = z.infer<typeof CurrencyAmountSchema>;

export const CurrencyBalanceSchema = z.object({
	cp: NonNegativeCurrencyIntegerSchema,
	sp: NonNegativeCurrencyIntegerSchema,
	gp: NonNegativeCurrencyIntegerSchema,
	pp: NonNegativeCurrencyIntegerSchema,
});
export type CurrencyBalance = z.infer<typeof CurrencyBalanceSchema>;

export const CurrencyDeltaSchema = z.object({
	cp: SignedCurrencyIntegerSchema,
	sp: SignedCurrencyIntegerSchema,
	gp: SignedCurrencyIntegerSchema,
	pp: SignedCurrencyIntegerSchema,
});
export type CurrencyDelta = z.infer<typeof CurrencyDeltaSchema>;

export const CurrencyTotalValueSchema = z
	.object({
		copper: NonNegativeCurrencyIntegerSchema,
		gp: z.number().nonnegative().finite(),
	})
	.refine((value) => value.gp === value.copper / DND_CURRENCY_TO_COPPER.gp, {
		message: "Total GP value must match the total copper value.",
		path: ["gp"],
	});
export type CurrencyTotalValue = z.infer<typeof CurrencyTotalValueSchema>;

export const CurrencyOperationSchema = z.enum(["add", "spend", "convert"]);
export type CurrencyOperation = z.infer<typeof CurrencyOperationSchema>;

export const InsufficientFundsErrorSchema = z.object({
	code: z.literal("INSUFFICIENT_FUNDS"),
	message: z.string().min(1).max(240),
	available: CurrencyTotalValueSchema,
	requested: CurrencyTotalValueSchema,
});
export type InsufficientFundsError = z.infer<typeof InsufficientFundsErrorSchema>;

export const InsufficientFundsResponseSchema = z.object({
	error: InsufficientFundsErrorSchema,
});
export type InsufficientFundsResponse = z.infer<typeof InsufficientFundsResponseSchema>;

export const CurrencyAddRequestSchema = z
	.object({ delta: CurrencyDeltaSchema })
	.refine((request) => hasAddableDelta(request.delta), {
		message: "An add request must contain only nonnegative values and at least one positive value.",
		path: ["delta"],
	});
export type CurrencyAddRequest = z.infer<typeof CurrencyAddRequestSchema>;

export const CurrencySpendRequestSchema = z.object({
	amount: CurrencyAmountSchema,
});
export type CurrencySpendRequest = z.infer<typeof CurrencySpendRequestSchema>;

export const CurrencyConversionRequestSchema = z
	.object({
		from: CurrencyDenominationSchema,
		to: CurrencyDenominationSchema,
		amount: PositiveCurrencyIntegerSchema,
	})
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
	);
export type CurrencyConversionRequest = z.infer<typeof CurrencyConversionRequestSchema>;

export const CurrencyApplyDeltaRequestSchema = z.object({
	delta: CurrencyDeltaSchema,
});
export type CurrencyApplyDeltaRequest = z.infer<typeof CurrencyApplyDeltaRequestSchema>;

export const CurrencyMutationResponseSchema = z.object({
	operation: CurrencyOperationSchema,
	previous: CurrencyBalanceSchema,
	next: CurrencyBalanceSchema,
	delta: CurrencyDeltaSchema,
	totalValue: CurrencyTotalValueSchema,
});
export type CurrencyMutationResponse = z.infer<typeof CurrencyMutationResponseSchema>;

export const CurrencyAddResponseSchema = CurrencyMutationResponseSchema.extend({
	operation: z.literal("add"),
});
export type CurrencyAddResponse = z.infer<typeof CurrencyAddResponseSchema>;

export const CurrencySpendResponseSchema = CurrencyMutationResponseSchema.extend({
	operation: z.literal("spend"),
	spent: CurrencyAmountSchema,
	change: CurrencyBalanceSchema.optional(),
});
export type CurrencySpendResponse = z.infer<typeof CurrencySpendResponseSchema>;

export const CurrencyConversionResponseSchema = CurrencyMutationResponseSchema.extend({
	operation: z.literal("convert"),
	from: CurrencyDenominationSchema,
	to: CurrencyDenominationSchema,
	amount: PositiveCurrencyIntegerSchema,
	convertedAmount: PositiveCurrencyIntegerSchema,
});
export type CurrencyConversionResponse = z.infer<typeof CurrencyConversionResponseSchema>;

export const CurrencyPreviewSchema = z.object({
	operation: CurrencyOperationSchema,
	previous: CurrencyBalanceSchema,
	next: CurrencyBalanceSchema,
	delta: CurrencyDeltaSchema,
	totalValue: CurrencyTotalValueSchema,
	canApply: z.boolean(),
	error: InsufficientFundsErrorSchema.optional(),
});
export type CurrencyPreview = z.infer<typeof CurrencyPreviewSchema>;

export function getCurrencyValueInCopper(balance: CurrencyBalance): number {
	const parsed = CurrencyBalanceSchema.parse(balance);
	return CURRENCY_DENOMINATIONS.reduce(
		(total, denomination) => total + parsed[denomination] * DND_CURRENCY_TO_COPPER[denomination],
		0,
	);
}

export function getCurrencyDeltaValueInCopper(delta: CurrencyDelta): number {
	const parsed = CurrencyDeltaSchema.parse(delta);
	return CURRENCY_DENOMINATIONS.reduce(
		(total, denomination) => total + parsed[denomination] * DND_CURRENCY_TO_COPPER[denomination],
		0,
	);
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
	return (
		(request.amount * DND_CURRENCY_TO_COPPER[request.from]) / DND_CURRENCY_TO_COPPER[request.to]
	);
}

function hasAddableDelta(delta: CurrencyDelta) {
	return (
		CURRENCY_DENOMINATIONS.every((denomination) => delta[denomination] >= 0) &&
		CURRENCY_DENOMINATIONS.some((denomination) => delta[denomination] > 0)
	);
}
