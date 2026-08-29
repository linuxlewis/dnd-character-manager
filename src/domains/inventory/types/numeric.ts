import { z } from "zod";

export const POSTGRES_INTEGER_MIN = -2_147_483_648;
export const POSTGRES_INTEGER_MAX = 2_147_483_647;
export const POSTGRES_REAL_MAX = 3.4028234663852886e38;

export const PostgresIntegerSchema = z
	.number()
	.int()
	.min(POSTGRES_INTEGER_MIN)
	.max(POSTGRES_INTEGER_MAX);
export type PostgresInteger = z.infer<typeof PostgresIntegerSchema>;

export const PostgresNonNegativeIntegerSchema = PostgresIntegerSchema.min(0);
export type PostgresNonNegativeInteger = z.infer<typeof PostgresNonNegativeIntegerSchema>;

export const PositivePostgresIntegerSchema = PostgresIntegerSchema.min(1);
export type PositivePostgresInteger = z.infer<typeof PositivePostgresIntegerSchema>;

export const PostgresNonNegativeRealSchema = z
	.number()
	.finite()
	.nonnegative()
	.max(POSTGRES_REAL_MAX);
export type PostgresNonNegativeReal = z.infer<typeof PostgresNonNegativeRealSchema>;

export const SafeIntegerSchema = z
	.number()
	.int()
	.min(Number.MIN_SAFE_INTEGER)
	.max(Number.MAX_SAFE_INTEGER);
export type SafeInteger = z.infer<typeof SafeIntegerSchema>;

export const NonNegativeSafeIntegerSchema = SafeIntegerSchema.min(0);
export type NonNegativeSafeInteger = z.infer<typeof NonNegativeSafeIntegerSchema>;
