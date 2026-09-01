import { z } from "zod";

const UuidSchema = z.string().uuid();

export const InventoryScopeIdSchema = UuidSchema;
export type InventoryScopeId = z.infer<typeof InventoryScopeIdSchema>;

export const InventoryItemIdSchema = UuidSchema;
export type InventoryItemId = z.infer<typeof InventoryItemIdSchema>;

export const CatalogueItemIdSchema = UuidSchema;
export type CatalogueItemId = z.infer<typeof CatalogueItemIdSchema>;

export const InventoryCharacterIdSchema = UuidSchema;
export type InventoryCharacterId = z.infer<typeof InventoryCharacterIdSchema>;

export const InventoryPartyIdSchema = UuidSchema;
export type InventoryPartyId = z.infer<typeof InventoryPartyIdSchema>;

export const InventoryOwnerTypeSchema = z.enum(["character", "party"]);
export type InventoryOwnerType = z.infer<typeof InventoryOwnerTypeSchema>;

export const CharacterInventoryScopeOwnerSchema = z.object({
	characterId: InventoryCharacterIdSchema,
	partyId: z.null(),
});
export type CharacterInventoryScopeOwner = z.infer<typeof CharacterInventoryScopeOwnerSchema>;

export const PartyInventoryScopeOwnerSchema = z.object({
	characterId: z.null(),
	partyId: InventoryPartyIdSchema,
});
export type PartyInventoryScopeOwner = z.infer<typeof PartyInventoryScopeOwnerSchema>;

export const InventoryScopeOwnerSchema = z.union([
	CharacterInventoryScopeOwnerSchema,
	PartyInventoryScopeOwnerSchema,
]);
export type InventoryScopeOwner = z.infer<typeof InventoryScopeOwnerSchema>;

export const InventoryScopeSchema = z
	.object({
		id: InventoryScopeIdSchema,
		characterId: InventoryCharacterIdSchema.nullable(),
		partyId: InventoryPartyIdSchema.nullable(),
		createdAt: z.iso.datetime(),
		updatedAt: z.iso.datetime(),
	})
	.refine(hasExactlyOneOwner, {
		message: "An inventory scope must have exactly one owner.",
		path: ["characterId"],
	});
export type InventoryScope = z.infer<typeof InventoryScopeSchema>;

export const InventoryScopeResponseSchema = z.object({
	scope: InventoryScopeSchema,
});
export type InventoryScopeResponse = z.infer<typeof InventoryScopeResponseSchema>;

function hasExactlyOneOwner(scope: { characterId: string | null; partyId: string | null }) {
	return Number(scope.characterId !== null) + Number(scope.partyId !== null) === 1;
}
