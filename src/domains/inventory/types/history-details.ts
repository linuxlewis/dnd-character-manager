import { z } from "zod";
import {
	CurrencyAddRequestSchema,
	CurrencyBalanceSchema,
	CurrencyConversionRequestSchema,
	CurrencyDeltaSchema,
	CurrencySpendRequestSchema,
} from "./currency.js";
import { InventoryItemIdSchema } from "./ids.js";
import { InventoryItemRaritySchema, InventoryItemTypeSchema } from "./item.js";
import { PositivePostgresIntegerSchema, PostgresNonNegativeRealSchema } from "./numeric.js";

export const InventoryHistoryActionSchema = z.enum([
	"item_added",
	"item_updated",
	"item_removed",
	"currency_updated",
]);
export type InventoryHistoryAction = z.infer<typeof InventoryHistoryActionSchema>;

export const InventoryHistoryEntityTypeSchema = z.enum(["item", "currency"]);
export type InventoryHistoryEntityType = z.infer<typeof InventoryHistoryEntityTypeSchema>;

export const InventoryHistoryItemSnapshotSchema = z
	.object({
		id: InventoryItemIdSchema,
		name: z.string().min(1).max(120).regex(/\S/),
		type: InventoryItemTypeSchema,
		category: z.string().min(1).max(120).regex(/\S/),
		rarity: InventoryItemRaritySchema.nullable(),
		quantity: PositivePostgresIntegerSchema,
		weight: PostgresNonNegativeRealSchema.nullable(),
		estimatedValue: PostgresNonNegativeRealSchema.nullable(),
		isEquipped: z.boolean(),
		notes: z.string().max(500).regex(/\S/).nullable().optional(),
	})
	.strict();
export type InventoryHistoryItemSnapshot = z.infer<typeof InventoryHistoryItemSnapshotSchema>;

export const InventoryHistoryItemChangedFieldSchema = z.string().min(1).max(80);
export type InventoryHistoryItemChangedField = z.infer<
	typeof InventoryHistoryItemChangedFieldSchema
>;

export const InventoryHistoryItemAddedDetailsSchema = z
	.object({ version: z.literal(1), item: InventoryHistoryItemSnapshotSchema })
	.strict();
export type InventoryHistoryItemAddedDetails = z.infer<
	typeof InventoryHistoryItemAddedDetailsSchema
>;

export const InventoryHistoryItemRemovedDetailsSchema = z
	.object({ version: z.literal(1), item: InventoryHistoryItemSnapshotSchema })
	.strict();
export type InventoryHistoryItemRemovedDetails = z.infer<
	typeof InventoryHistoryItemRemovedDetailsSchema
>;

export const InventoryHistoryItemUpdatedDetailsSchema = z
	.object({
		version: z.literal(1),
		before: InventoryHistoryItemSnapshotSchema,
		after: InventoryHistoryItemSnapshotSchema,
		changedFields: z.array(InventoryHistoryItemChangedFieldSchema).max(32),
	})
	.strict();
export type InventoryHistoryItemUpdatedDetails = z.infer<
	typeof InventoryHistoryItemUpdatedDetailsSchema
>;

const InventoryHistoryCurrencyDetailsBaseSchema = {
	version: z.literal(1),
	previous: CurrencyBalanceSchema,
	next: CurrencyBalanceSchema,
	delta: CurrencyDeltaSchema,
	note: z.string().max(500).regex(/\S/).nullable(),
};

export const InventoryHistoryCurrencyAddDetailsSchema = z
	.object({
		...InventoryHistoryCurrencyDetailsBaseSchema,
		operation: z.literal("add"),
		requested: CurrencyAddRequestSchema,
	})
	.strict();
export type InventoryHistoryCurrencyAddDetails = z.infer<
	typeof InventoryHistoryCurrencyAddDetailsSchema
>;

export const InventoryHistoryCurrencySpendDetailsSchema = z
	.object({
		...InventoryHistoryCurrencyDetailsBaseSchema,
		operation: z.literal("spend"),
		requested: CurrencySpendRequestSchema,
	})
	.strict();
export type InventoryHistoryCurrencySpendDetails = z.infer<
	typeof InventoryHistoryCurrencySpendDetailsSchema
>;

export const InventoryHistoryCurrencyConvertDetailsSchema = z
	.object({
		...InventoryHistoryCurrencyDetailsBaseSchema,
		operation: z.literal("convert"),
		requested: CurrencyConversionRequestSchema,
	})
	.strict();
export type InventoryHistoryCurrencyConvertDetails = z.infer<
	typeof InventoryHistoryCurrencyConvertDetailsSchema
>;

export const InventoryHistoryCurrencyUpdatedDetailsSchema = z.union([
	InventoryHistoryCurrencyAddDetailsSchema,
	InventoryHistoryCurrencySpendDetailsSchema,
	InventoryHistoryCurrencyConvertDetailsSchema,
]);
export type InventoryHistoryCurrencyUpdatedDetails = z.infer<
	typeof InventoryHistoryCurrencyUpdatedDetailsSchema
>;

export const InventoryHistoryDetailsSchema = z.union([
	InventoryHistoryItemAddedDetailsSchema,
	InventoryHistoryItemUpdatedDetailsSchema,
	InventoryHistoryItemRemovedDetailsSchema,
	InventoryHistoryCurrencyUpdatedDetailsSchema,
]);
export type InventoryHistoryDetails = z.infer<typeof InventoryHistoryDetailsSchema>;

export function parseInventoryHistoryDetails(
	action: unknown,
	entityType: unknown,
	details: unknown,
): InventoryHistoryDetails {
	const parsedAction = InventoryHistoryActionSchema.parse(action);
	const parsedEntityType = InventoryHistoryEntityTypeSchema.parse(entityType);

	if (parsedEntityType === "item") {
		if (parsedAction === "item_added") return parseVersionedOrLegacyItemAdded(details);
		if (parsedAction === "item_updated") return parseVersionedOrLegacyItemUpdated(details);
		if (parsedAction === "item_removed") return parseVersionedOrLegacyItemRemoved(details);
	}
	if (parsedEntityType === "currency" && parsedAction === "currency_updated") {
		return InventoryHistoryCurrencyUpdatedDetailsSchema.parse(details);
	}

	throw new z.ZodError([
		{
			code: "custom",
			path: [],
			message: "History details do not match the action and entity type.",
		},
	]);
}

const LegacyItemSnapshotSchema = z
	.object({
		id: InventoryItemIdSchema,
		name: z.string().min(1).max(120).regex(/\S/),
		type: InventoryItemTypeSchema,
		category: z.string().min(1).max(120).regex(/\S/),
		rarity: InventoryItemRaritySchema.nullable().optional().default(null),
		quantity: PositivePostgresIntegerSchema.optional().default(1),
		weight: PostgresNonNegativeRealSchema.nullable().optional().default(null),
		estimatedValue: PostgresNonNegativeRealSchema.nullable().optional().default(null),
		isEquipped: z.boolean().optional().default(false),
		notes: z.string().nullable().optional(),
	})
	.passthrough();

function parseVersionedOrLegacyItemAdded(details: unknown): InventoryHistoryItemAddedDetails {
	if (hasVersion(details)) return InventoryHistoryItemAddedDetailsSchema.parse(details);
	const wrapped = z.object({ item: LegacyItemSnapshotSchema }).passthrough().safeParse(details);
	const item = wrapped.success ? wrapped.data.item : LegacyItemSnapshotSchema.parse(details);
	return InventoryHistoryItemAddedDetailsSchema.parse({ version: 1, item: toItemSnapshot(item) });
}

function parseVersionedOrLegacyItemRemoved(details: unknown): InventoryHistoryItemRemovedDetails {
	if (hasVersion(details)) return InventoryHistoryItemRemovedDetailsSchema.parse(details);
	const wrapped = z.object({ item: LegacyItemSnapshotSchema }).passthrough().safeParse(details);
	const item = wrapped.success ? wrapped.data.item : LegacyItemSnapshotSchema.parse(details);
	return InventoryHistoryItemRemovedDetailsSchema.parse({ version: 1, item: toItemSnapshot(item) });
}

function parseVersionedOrLegacyItemUpdated(details: unknown): InventoryHistoryItemUpdatedDetails {
	if (hasVersion(details)) return InventoryHistoryItemUpdatedDetailsSchema.parse(details);
	const parsed = z
		.object({
			before: LegacyItemSnapshotSchema,
			after: LegacyItemSnapshotSchema,
			changedFields: z.array(InventoryHistoryItemChangedFieldSchema).optional(),
		})
		.passthrough()
		.parse(details);
	const before = toItemSnapshot(parsed.before);
	const after = toItemSnapshot(parsed.after);
	return InventoryHistoryItemUpdatedDetailsSchema.parse({
		version: 1,
		before,
		after,
		changedFields: parsed.changedFields ?? getChangedFields(before, after),
	});
}

function hasVersion(value: unknown): value is { version: unknown } {
	return typeof value === "object" && value !== null && "version" in value;
}

function toItemSnapshot(value: unknown): InventoryHistoryItemSnapshot {
	const parsed = LegacyItemSnapshotSchema.parse(value);
	const snapshot: Record<string, unknown> = {
		id: parsed.id,
		name: parsed.name,
		type: parsed.type,
		category: parsed.category,
		rarity: parsed.rarity,
		quantity: parsed.quantity,
		weight: parsed.weight,
		estimatedValue: parsed.estimatedValue,
		isEquipped: parsed.isEquipped,
	};
	const note = parsed.notes?.trim();
	if (note && note.length <= 500) snapshot.notes = note;
	return InventoryHistoryItemSnapshotSchema.parse(snapshot);
}

function getChangedFields(
	before: InventoryHistoryItemSnapshot,
	after: InventoryHistoryItemSnapshot,
): InventoryHistoryItemChangedField[] {
	const fields = [
		"name",
		"type",
		"category",
		"rarity",
		"quantity",
		"weight",
		"estimatedValue",
		"isEquipped",
		"notes",
	] as const;
	return fields.filter((field) => before[field] !== after[field]);
}
