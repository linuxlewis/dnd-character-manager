import {
	type CurrencyAddRequest,
	type CurrencyBalance,
	CurrencyBalanceSchema,
	type CurrencyConversionRequest,
	CurrencyConversionRequestSchema,
	type CurrencyDelta,
	type CurrencyPlan,
	CurrencyPlanningOverflowError,
	type CurrencySpendRequest,
	calculateSpend,
	convertDenominationAmount,
	planAdd as planCurrencyAdd,
	type SpendPlan,
} from "../types/index.js";
import {
	InsufficientDenominationError,
	InsufficientFundsError,
	TreasuryOverflowError,
} from "./character-treasury-errors.js";

export interface ConversionPlan extends CurrencyPlan {
	from: CurrencyConversionRequest["from"];
	to: CurrencyConversionRequest["to"];
	amount: number;
	convertedAmount: number;
}

export function planAdd(previous: CurrencyBalance, input: CurrencyAddRequest): CurrencyPlan {
	try {
		return planCurrencyAdd(previous, input);
	} catch (error) {
		if (error instanceof CurrencyPlanningOverflowError) {
			throw new TreasuryOverflowError(error.message);
		}
		throw error;
	}
}

export function planSpend(previous: CurrencyBalance, input: CurrencySpendRequest): SpendPlan {
	try {
		const result = calculateSpend(previous, input);
		if (!result.ok) throw new InsufficientFundsError(result.error);
		return result.plan;
	} catch (error) {
		if (error instanceof CurrencyPlanningOverflowError) {
			throw new TreasuryOverflowError(error.message);
		}
		throw error;
	}
}

export function planConversion(
	previous: CurrencyBalance,
	input: CurrencyConversionRequest,
): ConversionPlan {
	const balance = CurrencyBalanceSchema.parse(previous);
	const request = CurrencyConversionRequestSchema.parse(input);
	const available = balance[request.from];
	if (available < request.amount) {
		throw new InsufficientDenominationError(request.from, request.amount, available);
	}

	const convertedAmount = convertDenominationAmount(request.amount, request.from, request.to);
	const next = { ...balance };
	next[request.from] -= request.amount;
	next[request.to] += convertedAmount;
	const parsedNext = parseNextBalance(next);
	return {
		previous: balance,
		next: parsedNext,
		delta: toDelta(balance, parsedNext),
		from: request.from,
		to: request.to,
		amount: request.amount,
		convertedAmount,
	};
}

function toDelta(previous: CurrencyBalance, next: CurrencyBalance): CurrencyDelta {
	return {
		cp: next.cp - previous.cp,
		sp: next.sp - previous.sp,
		gp: next.gp - previous.gp,
		pp: next.pp - previous.pp,
	};
}

function parseNextBalance(balance: CurrencyBalance): CurrencyBalance {
	try {
		return CurrencyBalanceSchema.parse(balance);
	} catch {
		throw new TreasuryOverflowError();
	}
}
