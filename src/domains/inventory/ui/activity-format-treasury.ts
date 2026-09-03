import type { CharacterHistoryEntry, CurrencyBalance } from "../types/index.js";
import {
	asRecord,
	createMalformedActivityEntry,
	type FormattedActivityEntry,
	isNonNegativeInteger,
	isPositiveInteger,
} from "./activity-format-shared.js";

const DENOMINATIONS = ["pp", "gp", "sp", "cp"] as const;
const LABELS: Record<(typeof DENOMINATIONS)[number], string> = {
	cp: "CP",
	sp: "SP",
	gp: "GP",
	pp: "PP",
};
const NAMES: Record<(typeof DENOMINATIONS)[number], string> = {
	cp: "copper pieces",
	sp: "silver pieces",
	gp: "gold pieces",
	pp: "platinum pieces",
};

export function formatCurrencyHistoryEntry(entry: CharacterHistoryEntry): FormattedActivityEntry {
	const details = asRecord(entry.details);
	if (!details) return createMalformedActivityEntry();
	if (details.version !== undefined) {
		if (details.version !== 1) return createMalformedActivityEntry();
		const previous = toCurrencyBalance(details.previous);
		const next = toCurrencyBalance(details.next);
		const delta = toCurrencyDelta(details.delta);
		const operation = details.operation;
		if (
			!previous ||
			!next ||
			!delta ||
			!isCurrencyOperation(operation) ||
			!balancesMatchDelta(previous, next, delta)
		) {
			return createMalformedActivityEntry();
		}
		const requested = formatRequestedCurrency(operation, asRecord(details.requested));
		if (!requested) return createMalformedActivityEntry();
		if (operation === "add" && !addRequestMatchesDelta(asRecord(details.requested), delta)) {
			return createMalformedActivityEntry();
		}
		if (
			operation === "spend" &&
			!spendRequestMatchesBalance(asRecord(details.requested), previous, next)
		) {
			return createMalformedActivityEntry();
		}
		if (operation === "convert" && !conversionMatchesDelta(asRecord(details.requested), delta)) {
			return createMalformedActivityEntry();
		}
		return {
			accessibleDetail: formatBalanceDetail(previous, next, true),
			accessibleSummary: requested.accessible,
			detail: formatBalanceDetail(previous, next),
			icon: "coins",
			itemType: null,
			note: normalizeNote(details.note),
			summary: requested.visible,
			tone: "treasury",
			valueTone: operation === "add" ? "positive" : operation === "spend" ? "negative" : "neutral",
		};
	}

	const changes = asRecord(details.changes);
	const legacyPrevious = changes ? toCurrencyBalance(changes.old) : null;
	const legacyNext = changes ? toCurrencyBalance(changes.new) : null;
	if (!legacyPrevious || !legacyNext) return createMalformedActivityEntry();
	return {
		accessibleDetail: formatBalanceDetail(legacyPrevious, legacyNext, true),
		accessibleSummary: "Treasury updated",
		detail: formatBalanceDetail(legacyPrevious, legacyNext),
		icon: "coins",
		itemType: null,
		note: normalizeNote(details.note),
		summary: "Treasury updated",
		tone: "treasury",
		valueTone: "neutral",
	};
}

function formatRequestedCurrency(operation: string, requested: Record<string, unknown> | null) {
	if (!requested) return null;
	if (operation === "add") {
		const delta = toCurrencyDelta(requested.delta);
		const amount = delta ? formatCoins(delta) : null;
		return amount ? formatAction("Added", amount) : null;
	}
	if (operation === "spend") {
		const amount = asRecord(requested.amount);
		if (!amount || !isDenomination(amount.denomination) || !isPositiveInteger(amount.amount)) {
			return null;
		}
		return formatAction("Spent", formatCoinAmount(amount.denomination, amount.amount));
	}
	if (operation === "convert") {
		if (
			!isDenomination(requested.from) ||
			!isDenomination(requested.to) ||
			!isPositiveInteger(requested.amount)
		) {
			return null;
		}
		const source = formatCoinAmount(requested.from, requested.amount);
		const target = formatCoinAmount(
			requested.to,
			requested.amount * conversionRate(requested.from, requested.to),
		);
		return {
			accessible: `Converted ${source.accessible} to ${target.accessible}`,
			visible: `Converted ${source.visible} to ${target.visible}`,
		};
	}
	return null;
}

type CoinText = { accessible: string; visible: string };

function formatAction(action: "Added" | "Spent", amount: CoinText | null) {
	return amount
		? { accessible: `${action} ${amount.accessible}`, visible: `${action} ${amount.visible}` }
		: null;
}

function formatCoins(balance: CurrencyBalance): CoinText | null {
	const values = DENOMINATIONS.filter((denomination) => balance[denomination] !== 0).map(
		(denomination) => formatCoinAmount(denomination, balance[denomination]),
	);
	if (values.length === 0) return null;
	return {
		accessible: values.map((value) => value.accessible).join(" and "),
		visible: values.map((value) => value.visible).join(" and "),
	};
}

function formatCoinAmount(denomination: (typeof DENOMINATIONS)[number], amount: number): CoinText {
	return {
		accessible: `${amount.toLocaleString()} ${NAMES[denomination]}`,
		visible: `${amount.toLocaleString()} ${LABELS[denomination]}`,
	};
}

function formatBalanceDetail(previous: CurrencyBalance, next: CurrencyBalance, accessible = false) {
	return `Balance: ${formatBalance(previous, accessible)} -> ${formatBalance(next, accessible)}`;
}

function formatBalance(balance: CurrencyBalance, accessible: boolean) {
	const values = DENOMINATIONS.filter((denomination) => balance[denomination] !== 0).map(
		(denomination) =>
			formatCoinAmount(denomination, balance[denomination])[accessible ? "accessible" : "visible"],
	);
	return values.length > 0 ? values.join(" ") : accessible ? "0 gold pieces" : "0 GP";
}

function toCurrencyBalance(value: unknown): CurrencyBalance | null {
	const balance = asRecord(value);
	if (
		!balance ||
		!DENOMINATIONS.every((denomination) => isNonNegativeInteger(balance[denomination]))
	) {
		return null;
	}
	return {
		cp: balance.cp as number,
		gp: balance.gp as number,
		pp: balance.pp as number,
		sp: balance.sp as number,
	};
}

type CurrencyDelta = {
	cp: number;
	gp: number;
	pp: number;
	sp: number;
};

function toCurrencyDelta(value: unknown): CurrencyDelta | null {
	const delta = asRecord(value);
	if (
		!delta ||
		!DENOMINATIONS.every(
			(denomination) =>
				typeof delta[denomination] === "number" && Number.isSafeInteger(delta[denomination]),
		)
	) {
		return null;
	}
	return {
		cp: delta.cp as number,
		gp: delta.gp as number,
		pp: delta.pp as number,
		sp: delta.sp as number,
	};
}

function balancesMatchDelta(
	previous: CurrencyBalance,
	next: CurrencyBalance,
	delta: CurrencyDelta,
) {
	return DENOMINATIONS.every(
		(denomination) => next[denomination] - previous[denomination] === delta[denomination],
	);
}

function addRequestMatchesDelta(requested: Record<string, unknown> | null, delta: CurrencyDelta) {
	const requestedDelta = requested ? toCurrencyDelta(requested.delta) : null;
	return (
		requestedDelta !== null &&
		DENOMINATIONS.some((denomination) => requestedDelta[denomination] > 0) &&
		DENOMINATIONS.every(
			(denomination) =>
				requestedDelta[denomination] === delta[denomination] && requestedDelta[denomination] >= 0,
		)
	);
}

function spendRequestMatchesBalance(
	requested: Record<string, unknown> | null,
	previous: CurrencyBalance,
	next: CurrencyBalance,
) {
	const amount = requested ? asRecord(requested.amount) : null;
	if (!amount || !isDenomination(amount.denomination) || !isPositiveInteger(amount.amount))
		return false;
	const values = { cp: 1, sp: 10, gp: 100, pp: 1_000 };
	const previousCopper = DENOMINATIONS.reduce(
		(total, denomination) => total + previous[denomination] * values[denomination],
		0,
	);
	const nextCopper = DENOMINATIONS.reduce(
		(total, denomination) => total + next[denomination] * values[denomination],
		0,
	);
	return nextCopper - previousCopper === -(amount.amount as number) * values[amount.denomination];
}

function conversionMatchesDelta(requested: Record<string, unknown> | null, delta: CurrencyDelta) {
	if (
		!requested ||
		!isDenomination(requested.from) ||
		!isDenomination(requested.to) ||
		requested.from === requested.to ||
		!isPositiveInteger(requested.amount)
	) {
		return false;
	}
	const values = { cp: 1, sp: 10, gp: 100, pp: 1_000 };
	const convertedAmount =
		((requested.amount as number) * values[requested.from]) / values[requested.to];
	if (!Number.isSafeInteger(convertedAmount)) return false;
	return DENOMINATIONS.every((denomination) => {
		const expected =
			denomination === requested.from
				? -(requested.amount as number)
				: denomination === requested.to
					? convertedAmount
					: 0;
		return delta[denomination] === expected;
	});
}

function normalizeNote(value: unknown) {
	if (typeof value !== "string") return null;
	const note = value.trim().slice(0, 500);
	return note || null;
}

function isCurrencyOperation(value: unknown): value is "add" | "spend" | "convert" {
	return value === "add" || value === "spend" || value === "convert";
}

function isDenomination(value: unknown): value is (typeof DENOMINATIONS)[number] {
	return value === "cp" || value === "sp" || value === "gp" || value === "pp";
}

function conversionRate(from: (typeof DENOMINATIONS)[number], to: (typeof DENOMINATIONS)[number]) {
	const values = { cp: 1, sp: 10, gp: 100, pp: 1_000 };
	return values[from] / values[to];
}
