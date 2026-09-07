import {
	CURRENCY_DENOMINATIONS,
	type CurrencyBalance,
	CurrencyBalanceSchema,
	CurrencyConversionRequestSchema,
	type CurrencyDelta,
	CurrencyDeltaSchema,
	type CurrencyDenomination,
	type CurrencyTotalValue,
	CurrencyTotalValueSchema,
	DND_CURRENCY_TO_COPPER,
} from "../types/currency.js";
import { PositivePostgresIntegerSchema, SafeIntegerSchema } from "../types/numeric.js";

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
