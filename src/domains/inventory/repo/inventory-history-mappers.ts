import { z } from "zod";
import type { InventoryHistoryEntry } from "../types/index.js";
import {
	InventoryHistoryActionSchema,
	InventoryHistoryEntityTypeSchema,
	InventoryHistoryEntryInputSchema,
	InventoryHistoryEntrySchema,
	InventoryScopeIdSchema,
	JsonObjectSchema,
} from "../types/index.js";

const DatabaseDateSchema = z.union([z.date(), z.iso.datetime()]);

const InventoryHistoryDatabaseRowSchema = z
	.object({
		id: z.string().uuid(),
		inventoryScopeId: InventoryScopeIdSchema,
		action: InventoryHistoryActionSchema,
		entityType: InventoryHistoryEntityTypeSchema,
		entityId: z.string().uuid().nullable(),
		entityName: z.string().min(1).max(120).nullable(),
		details: z.unknown(),
		createdAt: DatabaseDateSchema,
	})
	.strict();

export function toInventoryHistoryEntry(row: unknown): InventoryHistoryEntry {
	const parsed = InventoryHistoryDatabaseRowSchema.parse(row);
	return InventoryHistoryEntrySchema.parse({
		...parsed,
		createdAt: toIsoString(parsed.createdAt),
		details: JsonObjectSchema.parse(parsed.details),
	});
}

export function toInventoryHistoryInsert(scopeId: unknown, input: unknown) {
	const parsedScopeId = InventoryScopeIdSchema.parse(scopeId);
	const parsed = InventoryHistoryEntryInputSchema.parse(input);
	return {
		inventoryScopeId: parsedScopeId,
		action: parsed.action,
		entityType: parsed.entityType,
		entityId: parsed.entityId,
		entityName: parsed.entityName,
		details: JsonObjectSchema.parse(parsed.details),
	};
}

function toIsoString(value: Date | string) {
	return value instanceof Date ? value.toISOString() : value;
}
