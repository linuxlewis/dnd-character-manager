import { z } from "zod";
import type {
	InventoryHistoryAction,
	InventoryHistoryDetails,
	InventoryHistoryEntityType,
} from "./history-details.js";
import {
	InventoryHistoryActionSchema,
	InventoryHistoryDetailsSchema,
	InventoryHistoryEntityTypeSchema,
	InventoryHistoryItemAddedDetailsSchema,
	InventoryHistoryItemRemovedDetailsSchema,
	InventoryHistoryItemUpdatedDetailsSchema,
	InventoryHistoryVersionedDetailsSchema,
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
	InventoryHistoryLegacyCurrencyDetails,
	InventoryHistoryVersionedDetails,
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
	InventoryHistoryLegacyCurrencyDetailsSchema,
	InventoryHistoryVersionedDetailsSchema,
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
			const details = parseInventoryHistoryDetails(entry.action, entry.entityType, entry.details);
			validateHistoryEntryMetadata(entry, details, ctx);
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
		details: InventoryHistoryVersionedDetailsSchema,
	})
	.strict()
	.superRefine((entry, ctx) => {
		try {
			const details = parseInventoryHistoryDetails(entry.action, entry.entityType, entry.details);
			validateHistoryEntryMetadata(entry, details, ctx);
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
		limit: z.number().int().min(1).max(100).default(20),
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

function validateHistoryEntryMetadata(
	entry: {
		entityType: InventoryHistoryEntityType;
		action: InventoryHistoryAction;
		entityId: string | null;
		entityName: string | null;
	},
	details: InventoryHistoryDetails,
	ctx: z.RefinementCtx,
) {
	if (entry.entityType === "currency") {
		if (entry.entityId !== null) {
			ctx.addIssue({
				code: "custom",
				path: ["entityId"],
				message: "Currency history entries cannot have an entity ID.",
			});
		}
		if (entry.entityName !== null) {
			ctx.addIssue({
				code: "custom",
				path: ["entityName"],
				message: "Currency history entries cannot have an entity name.",
			});
		}
		return;
	}

	if (entry.entityId === null) {
		ctx.addIssue({
			code: "custom",
			path: ["entityId"],
			message: "Item history entries require an entity ID.",
		});
	}
	if (entry.entityName === null) {
		ctx.addIssue({
			code: "custom",
			path: ["entityName"],
			message: "Item history entries require an entity name.",
		});
	}
	if (entry.entityId === null) return;

	const snapshotIds =
		entry.action === "item_updated"
			? (() => {
					const parsed = InventoryHistoryItemUpdatedDetailsSchema.parse(details);
					return [parsed.before.id, parsed.after.id];
				})()
			: entry.action === "item_added"
				? [InventoryHistoryItemAddedDetailsSchema.parse(details).item.id]
				: [InventoryHistoryItemRemovedDetailsSchema.parse(details).item.id];
	if (snapshotIds.some((snapshotId) => snapshotId !== entry.entityId)) {
		ctx.addIssue({
			code: "custom",
			path: ["details"],
			message: "Item history snapshot IDs must match the entity ID.",
		});
	}
}
