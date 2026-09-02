import type {
	CurrencyAmount,
	CurrencyBalance,
	CurrencyDelta,
	CurrencyTotalValue,
} from "../types/index.js";
import {
	CurrencyPlanningOverflowError,
	calculateSpend,
	getCurrencyTotalValue,
	planAdd,
} from "../types/index.js";

export type TreasuryDenomination = CurrencyAmount["denomination"];
export type TreasuryBalance = CurrencyBalance;
export type TreasuryTotalValue = CurrencyTotalValue;

export interface TreasuryData {
	balances: TreasuryBalance;
	totalValue: TreasuryTotalValue;
}

export type TreasuryAddRequest = { delta: TreasuryBalance; note?: string | null };
export type TreasurySpendRequest = { amount: CurrencyAmount; note?: string | null };

export interface TreasuryPreviewError {
	code: string;
	message: string;
}

export interface TreasuryPreviewBase {
	previous: TreasuryBalance;
	next: TreasuryBalance;
	delta: CurrencyDelta;
	totalValue: TreasuryTotalValue;
	canApply: boolean;
	error?: TreasuryPreviewError;
}

export type TreasuryAddPreview = TreasuryPreviewBase & { operation: "add" };
export type TreasurySpendPreview = TreasuryPreviewBase & { operation: "spend" };
export type TreasuryPreview = TreasuryAddPreview | TreasurySpendPreview;

export function createTreasuryNeutralPreview(
	treasury: TreasuryData,
	operation: "add",
): TreasuryAddPreview;
export function createTreasuryNeutralPreview(
	treasury: TreasuryData,
	operation: "spend",
): TreasurySpendPreview;
export function createTreasuryNeutralPreview(
	treasury: TreasuryData,
	operation: "add" | "spend",
): TreasuryPreview {
	const preview = {
		previous: treasury.balances,
		next: treasury.balances,
		delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
		totalValue: treasury.totalValue,
		canApply: false,
	} as const;

	if (operation === "add") return { operation, ...preview };
	return { operation, ...preview };
}

export function createTreasuryAddPreview(
	treasury: TreasuryData,
	request: TreasuryAddRequest,
): TreasuryAddPreview {
	try {
		const plan = planAdd(treasury.balances, request);
		return {
			operation: "add",
			previous: plan.previous,
			next: plan.next,
			delta: plan.delta,
			totalValue: getCurrencyTotalValue(plan.next),
			canApply: true,
		};
	} catch (error) {
		if (!(error instanceof CurrencyPlanningOverflowError)) throw error;
		return {
			operation: "add",
			previous: treasury.balances,
			next: treasury.balances,
			delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: treasury.totalValue,
			canApply: false,
			error: { code: error.code, message: error.message },
		};
	}
}

export function createTreasurySpendPreview(
	treasury: TreasuryData,
	request: TreasurySpendRequest,
): TreasurySpendPreview {
	try {
		const result = calculateSpend(treasury.balances, request);
		if (!result.ok) {
			return {
				operation: "spend",
				previous: result.previous,
				next: result.next,
				delta: result.delta,
				totalValue: result.totalValue,
				canApply: false,
				error: result.error,
			};
		}
		return {
			operation: "spend",
			previous: result.plan.previous,
			next: result.plan.next,
			delta: result.plan.delta,
			totalValue: getCurrencyTotalValue(result.plan.next),
			canApply: true,
		};
	} catch (error) {
		if (!(error instanceof CurrencyPlanningOverflowError)) throw error;
		return {
			operation: "spend",
			previous: treasury.balances,
			next: treasury.balances,
			delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: treasury.totalValue,
			canApply: false,
			error: { code: error.code, message: error.message },
		};
	}
}

export function treasuryBalancesEqual(left: TreasuryBalance, right: TreasuryBalance) {
	return (
		left.cp === right.cp && left.sp === right.sp && left.gp === right.gp && left.pp === right.pp
	);
}

export function normalizeTreasuryNote(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const note = value.trim();
	return note.length > 0 ? note : null;
}
