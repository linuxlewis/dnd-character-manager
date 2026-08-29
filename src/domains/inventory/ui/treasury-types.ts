import type { CurrencyAmount, CurrencyBalance, CurrencyTotalValue } from "../types/index.js";

export type TreasuryDenomination = CurrencyAmount["denomination"];
export type TreasuryBalance = CurrencyBalance;
export type TreasuryTotalValue = CurrencyTotalValue;

export interface TreasuryData {
	balances: TreasuryBalance;
	totalValue: TreasuryTotalValue;
}

export type TreasuryAddRequest = { delta: TreasuryBalance };
export type TreasurySpendRequest = { amount: CurrencyAmount };

export interface TreasuryPreviewError {
	code: string;
	message: string;
}

export interface TreasuryPreviewBase {
	previous: TreasuryBalance;
	next: TreasuryBalance;
	totalValue: TreasuryTotalValue;
	canApply: boolean;
	error?: TreasuryPreviewError;
}

export type TreasuryAddPreview = TreasuryPreviewBase & { operation: "add" };
export type TreasurySpendPreview = TreasuryPreviewBase & {
	operation: "spend";
	change?: TreasuryBalance;
};
export type TreasuryPreview = TreasuryAddPreview | TreasurySpendPreview;
