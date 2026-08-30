import {
	CURRENCY_DENOMINATIONS,
	type CurrencyAddRequest,
	CurrencyAddRequestSchema,
	type CurrencyBalance,
	CurrencyBalanceSchema,
	type CurrencyDelta,
	type CurrencySpendRequest,
	CurrencySpendRequestSchema,
	DND_CURRENCY_TO_COPPER,
	getCurrencyTotalValue,
	getCurrencyValueInCopper,
} from "./currency.js";
import { SafeIntegerSchema } from "./numeric.js";

export interface CurrencyPlan {
	previous: CurrencyBalance;
	next: CurrencyBalance;
	delta: CurrencyDelta;
}

export interface SpendPlan extends CurrencyPlan {
	change?: CurrencyBalance;
}

export type SpendPlanResult =
	| { ok: true; plan: SpendPlan }
	| {
			ok: false;
			previous: CurrencyBalance;
			next: CurrencyBalance;
			delta: CurrencyDelta;
			totalValue: ReturnType<typeof getCurrencyTotalValue>;
			error: {
				code: "INSUFFICIENT_FUNDS";
				message: string;
				available: ReturnType<typeof getCurrencyTotalValue>;
				requested: ReturnType<typeof getCurrencyTotalValue>;
			};
	  };

export class CurrencyPlanningOverflowError extends Error {
	readonly code = "TREASURY_OVERFLOW" as const;

	constructor(message = "The treasury balance exceeds the PostgreSQL integer limit.") {
		super(message);
		this.name = "CurrencyPlanningOverflowError";
	}
}

export function planAdd(previous: CurrencyBalance, input: CurrencyAddRequest): CurrencyPlan {
	const balance = CurrencyBalanceSchema.parse(previous);
	const request = CurrencyAddRequestSchema.parse(input);
	const next = addBalances(balance, request.delta);
	return { previous: balance, next, delta: request.delta };
}

export function calculateSpend(
	previous: CurrencyBalance,
	input: CurrencySpendRequest,
): SpendPlanResult {
	const balance = CurrencyBalanceSchema.parse(previous);
	const request = CurrencySpendRequestSchema.parse(input);
	const targetIndex = CURRENCY_DENOMINATIONS.indexOf(request.amount.denomination);
	const requestedCopper = safeCopper(
		request.amount.amount * DND_CURRENCY_TO_COPPER[request.amount.denomination],
	);
	const availableCopper = getCurrencyValueInCopper(balance);
	if (availableCopper < requestedCopper) {
		return {
			ok: false,
			previous: balance,
			next: balance,
			delta: zeroDelta(),
			totalValue: getCurrencyTotalValue(balance),
			error: {
				code: "INSUFFICIENT_FUNDS",
				message: "The treasury does not contain enough currency.",
				available: getCurrencyTotalValue(balance),
				requested: totalValueFromCopper(requestedCopper),
			},
		};
	}

	const exactPayment = selectExact(balance, requestedCopper);
	const selected = zeroBalance();
	let overpayCopper = 0;
	const higherValue = sumHigherDenominations(balance, targetIndex);

	if (exactPayment) {
		copyBalance(exactPayment, selected);
	} else if (higherValue >= requestedCopper) {
		selectHigherCoins(balance, targetIndex, requestedCopper, selected);
		overpayCopper = selectedValue(selected) - requestedCopper;
	} else {
		const lowerPayment = selectAtMost(balance, targetIndex, requestedCopper);
		copyBalance(lowerPayment.selected, selected);
		let shortfall = requestedCopper - selectedValue(selected);
		selectHigherCoins(balance, targetIndex, shortfall, selected);
		shortfall -= selectedValue(selected) - selectedValue(lowerPayment.selected);
		if (shortfall > 0)
			throw new CurrencyPlanningOverflowError("Unable to make exact currency change.");
		overpayCopper = -shortfall;
	}

	const change = overpayCopper > 0 ? balanceFromCopper(overpayCopper) : undefined;
	const next = addBalances(subtractBalances(balance, selected), change ?? zeroBalance());
	return { ok: true, plan: { previous: balance, next, delta: toDelta(balance, next), change } };
}

function selectExact(
	balance: CurrencyBalance,
	requestedCopper: number,
): CurrencyBalance | undefined {
	const selected = zeroBalance();
	let remaining = requestedCopper;

	for (let index = CURRENCY_DENOMINATIONS.length - 1; index >= 0; index -= 1) {
		const denomination = CURRENCY_DENOMINATIONS[index];
		const value = DND_CURRENCY_TO_COPPER[denomination];
		const amount = Math.min(balance[denomination], Math.floor(remaining / value));
		selected[denomination] = amount;
		remaining -= amount * value;
	}

	return remaining === 0 ? selected : undefined;
}

function selectAtMost(balance: CurrencyBalance, targetIndex: number, requestedCopper: number) {
	const selected = zeroBalance();
	let remaining = requestedCopper;
	for (let index = targetIndex; index >= 0; index -= 1) {
		const denomination = CURRENCY_DENOMINATIONS[index];
		const amount = Math.min(
			balance[denomination],
			Math.floor(remaining / DND_CURRENCY_TO_COPPER[denomination]),
		);
		selected[denomination] = amount;
		remaining -= amount * DND_CURRENCY_TO_COPPER[denomination];
	}
	return { selected, remaining };
}

function selectHigherCoins(
	balance: CurrencyBalance,
	targetIndex: number,
	requestedCopper: number,
	selected: CurrencyBalance,
) {
	let remaining = requestedCopper;
	for (let index = targetIndex + 1; index < CURRENCY_DENOMINATIONS.length; index += 1) {
		if (remaining <= 0) break;
		const denomination = CURRENCY_DENOMINATIONS[index];
		const value = DND_CURRENCY_TO_COPPER[denomination];
		const amount = Math.min(balance[denomination], Math.ceil(remaining / value));
		selected[denomination] += amount;
		remaining -= amount * value;
	}
}

function sumHigherDenominations(balance: CurrencyBalance, targetIndex: number) {
	return CURRENCY_DENOMINATIONS.slice(targetIndex + 1).reduce(
		(total, denomination) => total + balance[denomination] * DND_CURRENCY_TO_COPPER[denomination],
		0,
	);
}

function selectedValue(balance: CurrencyBalance) {
	return CURRENCY_DENOMINATIONS.reduce(
		(total, denomination) => total + balance[denomination] * DND_CURRENCY_TO_COPPER[denomination],
		0,
	);
}

function addBalances(
	left: CurrencyBalance,
	right: CurrencyDelta | CurrencyBalance,
): CurrencyBalance {
	return parseNextBalance({
		cp: left.cp + right.cp,
		sp: left.sp + right.sp,
		gp: left.gp + right.gp,
		pp: left.pp + right.pp,
	});
}

function subtractBalances(left: CurrencyBalance, right: CurrencyBalance): CurrencyBalance {
	return parseNextBalance({
		cp: left.cp - right.cp,
		sp: left.sp - right.sp,
		gp: left.gp - right.gp,
		pp: left.pp - right.pp,
	});
}

function balanceFromCopper(copper: number): CurrencyBalance {
	let remaining = safeCopper(copper);
	const balance = zeroBalance();
	for (let index = CURRENCY_DENOMINATIONS.length - 1; index >= 0; index -= 1) {
		const denomination = CURRENCY_DENOMINATIONS[index];
		const value = DND_CURRENCY_TO_COPPER[denomination];
		balance[denomination] = Math.floor(remaining / value);
		remaining %= value;
	}
	return parseNextBalance(balance);
}

function toDelta(previous: CurrencyBalance, next: CurrencyBalance): CurrencyDelta {
	return {
		cp: next.cp - previous.cp,
		sp: next.sp - previous.sp,
		gp: next.gp - previous.gp,
		pp: next.pp - previous.pp,
	};
}

function copyBalance(source: CurrencyBalance, target: CurrencyBalance) {
	for (const denomination of CURRENCY_DENOMINATIONS) target[denomination] = source[denomination];
}

function zeroBalance(): CurrencyBalance {
	return { cp: 0, sp: 0, gp: 0, pp: 0 };
}

function zeroDelta(): CurrencyDelta {
	return { cp: 0, sp: 0, gp: 0, pp: 0 };
}

function parseNextBalance(balance: CurrencyBalance): CurrencyBalance {
	try {
		return CurrencyBalanceSchema.parse(balance);
	} catch {
		throw new CurrencyPlanningOverflowError();
	}
}

function safeCopper(copper: number) {
	return SafeIntegerSchema.parse(copper);
}

function totalValueFromCopper(copper: number) {
	return { copper, gp: copper / DND_CURRENCY_TO_COPPER.gp };
}
