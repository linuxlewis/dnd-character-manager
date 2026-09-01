import type { TreasuryBalance, TreasuryDenomination } from "./treasury-types.js";

export type {
	TreasuryAddPreview as AddTreasuryPreview,
	TreasuryBalance,
	TreasuryDenomination,
	TreasurySpendPreview as SpendTreasuryPreview,
} from "./treasury-types.js";

export const TREASURY_DENOMINATIONS = [
	{ key: "pp", abbreviation: "PP", label: "Platinum pieces", color: "indigo" },
	{ key: "gp", abbreviation: "GP", label: "Gold pieces", color: "yellow" },
	{ key: "sp", abbreviation: "SP", label: "Silver pieces", color: "gray" },
	{ key: "cp", abbreviation: "CP", label: "Copper pieces", color: "orange" },
] as const satisfies ReadonlyArray<{
	key: TreasuryDenomination;
	abbreviation: string;
	label: string;
	color: string;
}>;

export function formatTreasuryAmount(amount: number) {
	return new Intl.NumberFormat("en-US").format(amount);
}

export function formatTreasuryGpValue(value: number) {
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

export function formatTreasuryBalance(balance: TreasuryBalance) {
	return TREASURY_DENOMINATIONS.map(
		({ key, abbreviation }) => `${abbreviation} ${formatTreasuryAmount(balance[key])}`,
	).join(" · ");
}

export function getTreasuryErrorMessage(error: unknown, fallback: string) {
	if (!isRecord(error) || !isRecord(error.body)) return fallback;
	if (typeof error.body.error === "string") return error.body.error;
	if (isRecord(error.body.error) && typeof error.body.error.message === "string") {
		return error.body.error.message;
	}
	return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
