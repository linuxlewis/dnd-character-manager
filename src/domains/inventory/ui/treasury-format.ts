import type {
	AddCharacterTreasuryPreviewResponse,
	CharacterTreasuryResponse,
	SpendCharacterTreasuryPreviewResponse,
	SpendCharacterTreasuryRequest,
} from "../../../generated/api-client.generated.js";
import { ApiClientError } from "../../../generated/api-client.generated.js";

export type TreasuryBalance = CharacterTreasuryResponse["treasury"]["balances"];
export type TreasuryDenomination = SpendCharacterTreasuryRequest["amount"]["denomination"];
export type AddTreasuryPreview = AddCharacterTreasuryPreviewResponse["preview"];
export type SpendTreasuryPreview = SpendCharacterTreasuryPreviewResponse["preview"];

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

export function getTreasuryErrorMessage(error: Error | null, fallback: string) {
	if (!(error instanceof ApiClientError)) return fallback;
	if (!isRecord(error.body)) return fallback;
	if (typeof error.body.error === "string") return error.body.error;
	if (isRecord(error.body.error) && typeof error.body.error.message === "string") {
		return error.body.error.message;
	}
	return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
