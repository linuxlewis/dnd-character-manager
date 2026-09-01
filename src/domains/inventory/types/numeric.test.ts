import { describe, expect, it } from "vitest";
import {
	POSTGRES_INTEGER_MAX,
	POSTGRES_INTEGER_MIN,
	PositivePostgresIntegerSchema,
	PostgresIntegerSchema,
	PostgresNonNegativeIntegerSchema,
	SafeIntegerSchema,
} from "./numeric.js";

describe("numeric boundary schemas", () => {
	it("accept exact PostgreSQL integer bounds and reject values beyond them", () => {
		expect(PostgresIntegerSchema.parse(POSTGRES_INTEGER_MIN)).toBe(POSTGRES_INTEGER_MIN);
		expect(PostgresIntegerSchema.parse(POSTGRES_INTEGER_MAX)).toBe(POSTGRES_INTEGER_MAX);
		expect(() => PostgresIntegerSchema.parse(POSTGRES_INTEGER_MIN - 1)).toThrow();
		expect(() => PostgresIntegerSchema.parse(POSTGRES_INTEGER_MAX + 1)).toThrow();
	});

	it("keeps persisted nonnegative and positive values inside the PostgreSQL range", () => {
		expect(PostgresNonNegativeIntegerSchema.parse(POSTGRES_INTEGER_MAX)).toBe(POSTGRES_INTEGER_MAX);
		expect(PositivePostgresIntegerSchema.parse(POSTGRES_INTEGER_MAX)).toBe(POSTGRES_INTEGER_MAX);
		expect(() => PostgresNonNegativeIntegerSchema.parse(-1)).toThrow();
		expect(() => PositivePostgresIntegerSchema.parse(0)).toThrow();
		expect(() => PositivePostgresIntegerSchema.parse(POSTGRES_INTEGER_MAX + 1)).toThrow();
	});

	it("accepts safe integer results from canonical currency arithmetic", () => {
		const convertedCopper = POSTGRES_INTEGER_MAX * 1_000;

		expect(Number.isSafeInteger(convertedCopper)).toBe(true);
		expect(SafeIntegerSchema.parse(convertedCopper)).toBe(convertedCopper);
		expect(SafeIntegerSchema.parse(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
		expect(() => SafeIntegerSchema.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow();
	});
});
