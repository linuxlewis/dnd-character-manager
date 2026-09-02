import { z } from "zod";
import type {
	CurrencyAddRequest,
	CurrencyBalance,
	CurrencyConversionRequest,
	CurrencyDelta,
	CurrencySpendRequest,
} from "./currency.js";
import {
	CURRENCY_DENOMINATIONS,
	CurrencyAddRequestSchema,
	CurrencyBalanceSchema,
	CurrencyConversionRequestSchema,
	CurrencyDeltaSchema,
	CurrencyNoteSchema,
	CurrencySpendRequestSchema,
	convertDenominationAmount,
	DND_CURRENCY_TO_COPPER,
	getCurrencyValueInCopper,
} from "./currency.js";

const InventoryHistoryCurrencyDetailsBaseSchema = {
	version: z.literal(1),
	previous: CurrencyBalanceSchema,
	next: CurrencyBalanceSchema,
	delta: CurrencyDeltaSchema,
	note: CurrencyNoteSchema,
};

export const InventoryHistoryCurrencyAddDetailsSchema = z
	.object({
		...InventoryHistoryCurrencyDetailsBaseSchema,
		operation: z.literal("add"),
		requested: CurrencyAddRequestSchema,
	})
	.strict()
	.superRefine(validateCurrencyInvariants);
export type InventoryHistoryCurrencyAddDetails = z.infer<
	typeof InventoryHistoryCurrencyAddDetailsSchema
>;

export const InventoryHistoryCurrencySpendDetailsSchema = z
	.object({
		...InventoryHistoryCurrencyDetailsBaseSchema,
		operation: z.literal("spend"),
		requested: CurrencySpendRequestSchema,
	})
	.strict()
	.superRefine(validateCurrencyInvariants);
export type InventoryHistoryCurrencySpendDetails = z.infer<
	typeof InventoryHistoryCurrencySpendDetailsSchema
>;

export const InventoryHistoryCurrencyConvertDetailsSchema = z
	.object({
		...InventoryHistoryCurrencyDetailsBaseSchema,
		operation: z.literal("convert"),
		requested: CurrencyConversionRequestSchema,
	})
	.strict()
	.superRefine(validateCurrencyInvariants);
export type InventoryHistoryCurrencyConvertDetails = z.infer<
	typeof InventoryHistoryCurrencyConvertDetailsSchema
>;

export const InventoryHistoryCurrencyUpdatedDetailsSchema = z.union([
	InventoryHistoryCurrencyAddDetailsSchema,
	InventoryHistoryCurrencySpendDetailsSchema,
	InventoryHistoryCurrencyConvertDetailsSchema,
]);
export type InventoryHistoryCurrencyUpdatedDetails = z.infer<
	typeof InventoryHistoryCurrencyUpdatedDetailsSchema
>;

export const InventoryHistoryLegacyCurrencyDetailsSchema = z
	.object({
		changes: z.object({ old: CurrencyBalanceSchema, new: CurrencyBalanceSchema }).strict(),
		note: z
			.preprocess(normalizeLegacyHistoryNote, z.string().max(500).regex(/\S/).nullable())
			.optional()
			.default(null),
	})
	.passthrough();
export type InventoryHistoryLegacyCurrencyDetails = z.infer<
	typeof InventoryHistoryLegacyCurrencyDetailsSchema
>;

function normalizeLegacyHistoryNote(value: unknown) {
	const note = typeof value === "string" ? value.trim() : value;
	return typeof note === "string" ? (note.length > 0 ? note.slice(0, 500) : null) : note;
}

function validateCurrencyInvariants(
	value: {
		previous: CurrencyBalance;
		next: CurrencyBalance;
		delta: CurrencyDelta;
	} & (
		| { operation: "add"; requested: CurrencyAddRequest }
		| { operation: "spend"; requested: CurrencySpendRequest }
		| { operation: "convert"; requested: CurrencyConversionRequest }
	),
	ctx: z.RefinementCtx,
) {
	for (const denomination of CURRENCY_DENOMINATIONS) {
		if (value.delta[denomination] !== value.next[denomination] - value.previous[denomination]) {
			ctx.addIssue({
				code: "custom",
				path: ["delta", denomination],
				message: "Currency delta must equal next minus previous.",
			});
		}
	}

	if (value.operation === "add") {
		if (!("delta" in value.requested)) return;
		const requestedDelta = value.requested.delta;
		for (const denomination of CURRENCY_DENOMINATIONS) {
			if (requestedDelta[denomination] !== value.delta[denomination]) {
				ctx.addIssue({
					code: "custom",
					path: ["requested", "delta", denomination],
					message: "Requested currency delta must match the recorded delta.",
				});
			}
		}
		return;
	}

	if (value.operation === "spend") {
		const requestedCopper =
			value.requested.amount.amount * DND_CURRENCY_TO_COPPER[value.requested.amount.denomination];
		const actualCopperChange =
			getCurrencyValueInCopper(value.next) - getCurrencyValueInCopper(value.previous);
		if (actualCopperChange !== -requestedCopper) {
			ctx.addIssue({
				code: "custom",
				path: ["next"],
				message: "Spend balances must reduce total copper value by the requested amount.",
			});
		}
		return;
	}

	const convertedAmount = convertDenominationAmount(
		value.requested.amount,
		value.requested.from,
		value.requested.to,
	);
	const expectedDelta = { cp: 0, sp: 0, gp: 0, pp: 0 };
	expectedDelta[value.requested.from] -= value.requested.amount;
	expectedDelta[value.requested.to] += convertedAmount;
	for (const denomination of CURRENCY_DENOMINATIONS) {
		if (value.delta[denomination] !== expectedDelta[denomination]) {
			ctx.addIssue({
				code: "custom",
				path: ["delta", denomination],
				message: "Conversion delta must match the requested source and target effects.",
			});
		}
	}
	if (getCurrencyValueInCopper(value.next) !== getCurrencyValueInCopper(value.previous)) {
		ctx.addIssue({
			code: "custom",
			path: ["next"],
			message: "Conversion must preserve total copper value.",
		});
	}
}
