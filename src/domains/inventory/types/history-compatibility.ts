import { z } from "zod";
import type {
	CharacterHistoryEntry,
	InventoryHistoryAction,
	InventoryHistoryEntityType,
	ListCharacterHistoryResponse,
} from "./history.js";
import {
	CharacterHistoryEntrySchema,
	InventoryHistoryActionSchema,
	InventoryHistoryEntityTypeSchema,
} from "./history.js";

const ListCharacterHistoryResponseEnvelopeSchema = z
	.object({
		entries: z.array(z.unknown()),
		total: z.number().int().nonnegative(),
		limit: z.number().int().min(1).max(100),
		offset: z.number().int().nonnegative(),
		hasMore: z.boolean(),
	})
	.strict();

/**
 * Keep the public history contract strict while isolating malformed legacy rows
 * at the browser boundary so valid activity remains visible.
 */
export function decodeCharacterHistoryPage(body: unknown): ListCharacterHistoryResponse {
	const page = ListCharacterHistoryResponseEnvelopeSchema.parse(body);
	return {
		...page,
		entries: page.entries.map((entry, index) =>
			decodeCharacterHistoryEntry(entry, page.offset, index),
		),
	};
}

export const ListCharacterHistoryResponseCompatibilityParser = {
	parse: decodeCharacterHistoryPage,
} as const;

function decodeCharacterHistoryEntry(
	value: unknown,
	offset: number,
	index: number,
): CharacterHistoryEntry {
	const parsed = CharacterHistoryEntrySchema.safeParse(value);
	if (parsed.success) return parsed.data;

	const raw = asRecord(value);
	return {
		id: readText(raw?.id) ?? `malformed-history-${offset}-${index}`,
		entityId: readUuidOrNull(raw?.entityId),
		entityName: readNullableText(raw?.entityName),
		entityType: readEntityType(raw?.entityType),
		action: readAction(raw?.action),
		actorUserId: readUuidOrNull(raw?.actorUserId),
		createdAt: readText(raw?.createdAt) ?? "",
		details: { __malformedHistoryEntry: true } as unknown as CharacterHistoryEntry["details"],
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readText(value: unknown) {
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNullableText(value: unknown) {
	return value === null ? null : readText(value);
}

function readUuidOrNull(value: unknown) {
	return typeof value === "string" && z.uuid().safeParse(value).success ? value : null;
}

function readAction(value: unknown): InventoryHistoryAction {
	return InventoryHistoryActionSchema.safeParse(value).success
		? (value as InventoryHistoryAction)
		: "item_updated";
}

function readEntityType(value: unknown): InventoryHistoryEntityType {
	return InventoryHistoryEntityTypeSchema.safeParse(value).success
		? (value as InventoryHistoryEntityType)
		: "item";
}
