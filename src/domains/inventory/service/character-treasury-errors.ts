import type {
	CurrencyDenomination,
	InsufficientDenominationError as InsufficientDenominationDetails,
	InsufficientFundsError as InsufficientFundsDetails,
} from "../types/index.js";
import {
	InsufficientDenominationErrorSchema,
	InsufficientFundsErrorSchema,
} from "../types/index.js";

export class InsufficientFundsError extends Error {
	readonly code = "INSUFFICIENT_FUNDS" as const;
	readonly details: InsufficientFundsDetails;

	constructor(details: Omit<InsufficientFundsDetails, "code">) {
		const parsed = InsufficientFundsErrorSchema.parse({ code: "INSUFFICIENT_FUNDS", ...details });
		super(parsed.message);
		this.name = "InsufficientFundsError";
		this.details = parsed;
	}
}

export class InsufficientDenominationError extends Error {
	readonly code = "INSUFFICIENT_DENOMINATION" as const;
	readonly details: InsufficientDenominationDetails;

	constructor(denomination: CurrencyDenomination, requested: number, available: number) {
		const parsed = InsufficientDenominationErrorSchema.parse({
			code: "INSUFFICIENT_DENOMINATION",
			message: `The treasury does not contain enough ${denomination.toUpperCase()} coins to convert.`,
			denomination,
			requested,
			available,
		});
		super(parsed.message);
		this.name = "InsufficientDenominationError";
		this.details = parsed;
	}
}

export class TreasuryOverflowError extends Error {
	readonly code = "TREASURY_OVERFLOW" as const;

	constructor(message = "The treasury balance exceeds the PostgreSQL integer limit.") {
		super(message);
		this.name = "TreasuryOverflowError";
	}
}
