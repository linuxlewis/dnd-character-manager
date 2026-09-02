import { z } from "zod";
import {
	InventoryHistoryActionSchema,
	InventoryHistoryDetailsSchema,
	InventoryHistoryEntityTypeSchema,
	parseInventoryHistoryDetails,
} from "./history-details.js";
import { InventoryItemIdSchema, InventoryScopeIdSchema } from "./ids.js";

export type {
	InventoryHistoryAction,
	InventoryHistoryCurrencyAddDetails,
	InventoryHistoryCurrencyConvertDetails,
	InventoryHistoryCurrencySpendDetails,
	InventoryHistoryCurrencyUpdatedDetails,
	InventoryHistoryDetails,
	InventoryHistoryEntityType,
	InventoryHistoryItemAddedDetails,
	InventoryHistoryItemChangedField,
	InventoryHistoryItemRemovedDetails,
	InventoryHistoryItemSnapshot,
	InventoryHistoryItemUpdatedDetails,
} from "./history-details.js";
export {
	InventoryHistoryActionSchema,
	InventoryHistoryCurrencyAddDetailsSchema,
	InventoryHistoryCurrencyConvertDetailsSchema,
	InventoryHistoryCurrencySpendDetailsSchema,
	InventoryHistoryCurrencyUpdatedDetailsSchema,
	InventoryHistoryDetailsSchema,
	InventoryHistoryEntityTypeSchema,
	InventoryHistoryItemAddedDetailsSchema,
	InventoryHistoryItemChangedFieldSchema,
	InventoryHistoryItemRemovedDetailsSchema,
	InventoryHistoryItemSnapshotSchema,
	InventoryHistoryItemUpdatedDetailsSchema,
	parseInventoryHistoryDetails,
} from "./history-details.js";

export const InventoryHistoryActorUserIdSchema = z.string().uuid();
export type InventoryHistoryActorUserId = z.infer<typeof InventoryHistoryActorUserIdSchema>;

export const InventoryHistoryEntrySchema = z
	.object({
		id: z.string().uuid(),
		inventoryScopeId: InventoryScopeIdSchema,
		action: InventoryHistoryActionSchema,
		entityType: InventoryHistoryEntityTypeSchema,
		entityId: InventoryItemIdSchema.nullable(),
		entityName: z.string().min(1).max(120).nullable(),
		actorUserId: InventoryHistoryActorUserIdSchema.nullable(),
		details: InventoryHistoryDetailsSchema,
		createdAt: z.iso.datetime(),
	})
	.strict()
	.superRefine((entry, ctx) => {
		try {
			parseInventoryHistoryDetails(entry.action, entry.entityType, entry.details);
		} catch {
			ctx.addIssue({
				code: "custom",
				path: ["details"],
				message: "History details do not match the action and entity type.",
			});
		}
	});
export type InventoryHistoryEntry = z.infer<typeof InventoryHistoryEntrySchema>;

export const InventoryHistoryEntryInputSchema = z
	.object({
		action: InventoryHistoryActionSchema,
		entityType: InventoryHistoryEntityTypeSchema,
		entityId: InventoryItemIdSchema.nullable().optional().default(null),
		entityName: z.string().min(1).max(120).nullable().optional().default(null),
		actorUserId: InventoryHistoryActorUserIdSchema.nullable().optional().default(null),
		details: InventoryHistoryDetailsSchema,
	})
	.strict()
	.superRefine((entry, ctx) => {
		try {
			parseInventoryHistoryDetails(entry.action, entry.entityType, entry.details);
		} catch {
			ctx.addIssue({
				code: "custom",
				path: ["details"],
				message: "History details do not match the action and entity type.",
			});
		}
	});
export type InventoryHistoryEntryInput = z.input<typeof InventoryHistoryEntryInputSchema>;

export const InventoryHistoryPageRequestSchema = z
	.object({
		limit: z.number().int().min(1).max(100).default(50),
		offset: z.number().int().nonnegative().default(0),
		action: InventoryHistoryActionSchema.nullable().optional(),
		entityType: InventoryHistoryEntityTypeSchema.nullable().optional(),
	})
	.strict();
export type InventoryHistoryPageRequest = z.infer<typeof InventoryHistoryPageRequestSchema>;

export const InventoryHistoryPageSchema = z
	.object({
		entries: z.array(InventoryHistoryEntrySchema),
		total: z.number().int().nonnegative(),
		limit: z.number().int().min(1).max(100),
		offset: z.number().int().nonnegative(),
		hasMore: z.boolean(),
	})
	.strict();
export type InventoryHistoryPage = z.infer<typeof InventoryHistoryPageSchema>;

export function parseInventoryHistoryEntryInput(input: unknown): InventoryHistoryEntryInput {
	const parsed = z
		.object({
			action: InventoryHistoryActionSchema,
			entityType: InventoryHistoryEntityTypeSchema,
			entityId: InventoryItemIdSchema.nullable().optional(),
			entityName: z.string().min(1).max(120).nullable().optional(),
			actorUserId: InventoryHistoryActorUserIdSchema.nullable().optional(),
			details: z.unknown(),
		})
		.strict()
		.parse(input);

	return InventoryHistoryEntryInputSchema.parse({
		...parsed,
		details: parseInventoryHistoryDetails(parsed.action, parsed.entityType, parsed.details),
	});
}
