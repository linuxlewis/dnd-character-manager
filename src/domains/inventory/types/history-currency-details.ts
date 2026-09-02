import { z } from "zod";
import type {
	CurrencyAddRequest,
	CurrencyBalance,
	CurrencyConversionRequest,
	CurrencyDelta,
	CurrencyOperation,
	CurrencySpendRequest,
} from "./currency.js";
import {
	CURRENCY_DENOMINATIONS,
	CurrencyAddRequestSchema,
	CurrencyBalanceSchema,
	CurrencyConversionRequestSchema,
	CurrencyDeltaSchema,
	CurrencySpendRequestSchema,
} from "./currency.js";

const InventoryHistoryCurrencyDetailsBaseSchema = {
	version: z.literal(1),
	previous: CurrencyBalanceSchema,
	next: CurrencyBalanceSchema,
	delta: CurrencyDeltaSchema,
	note: z.preprocess(normalizeHistoryNote, z.string().max(500).regex(/\S/).nullable()),
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
			.preprocess(normalizeHistoryNote, z.string().max(500).regex(/\S/).nullable())
			.optional()
			.default(null),
	})
	.passthrough();
export type InventoryHistoryLegacyCurrencyDetails = z.infer<
	typeof InventoryHistoryLegacyCurrencyDetailsSchema
>;

function normalizeHistoryNote(value: unknown) {
	if (typeof value !== "string") return value;
	const note = value.trim();
	return note.length > 0 ? note : null;
}

function validateCurrencyInvariants(
	value: {
		previous: CurrencyBalance;
		next: CurrencyBalance;
		delta: CurrencyDelta;
		operation: CurrencyOperation;
		requested: CurrencyAddRequest | CurrencySpendRequest | CurrencyConversionRequest;
	},
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
	}
}
