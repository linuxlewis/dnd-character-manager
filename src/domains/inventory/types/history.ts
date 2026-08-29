import { z } from "zod";
import { InventoryItemIdSchema, InventoryScopeIdSchema } from "./ids.js";
import { JsonObjectSchema } from "./item.js";

export const InventoryHistoryActionSchema = z.enum([
	"item_added",
	"item_updated",
	"item_removed",
	"currency_updated",
]);
export type InventoryHistoryAction = z.infer<typeof InventoryHistoryActionSchema>;

export const InventoryHistoryEntityTypeSchema = z.enum(["item", "currency"]);
export type InventoryHistoryEntityType = z.infer<typeof InventoryHistoryEntityTypeSchema>;

export const InventoryHistoryEntrySchema = z
	.object({
		id: z.string().uuid(),
		inventoryScopeId: InventoryScopeIdSchema,
		action: InventoryHistoryActionSchema,
		entityType: InventoryHistoryEntityTypeSchema,
		entityId: InventoryItemIdSchema.nullable(),
		entityName: z.string().min(1).max(120).nullable(),
		details: JsonObjectSchema,
		createdAt: z.iso.datetime(),
	})
	.strict();
export type InventoryHistoryEntry = z.infer<typeof InventoryHistoryEntrySchema>;

export const InventoryHistoryEntryInputSchema = z
	.object({
		action: InventoryHistoryActionSchema,
		entityType: InventoryHistoryEntityTypeSchema,
		entityId: InventoryItemIdSchema.nullable().optional().default(null),
		entityName: z.string().min(1).max(120).nullable().optional().default(null),
		details: JsonObjectSchema.default({}),
	})
	.strict();
export type InventoryHistoryEntryInput = z.input<typeof InventoryHistoryEntryInputSchema>;

export const InventoryHistoryPageRequestSchema = z
	.object({
		limit: z.number().int().min(1).max(100).default(50),
		offset: z.number().int().nonnegative().default(0),
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
