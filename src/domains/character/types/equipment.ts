/**
 * Equipment — types and pure functions for the equipment/inventory system.
 *
 * Covers item categories, equipment toggling, and carrying capacity (D&D 5e rules).
 */

import { z } from "zod";

export const ItemCategorySchema = z.enum([
	"weapon",
	"armor",
	"shield",
	"ammunition",
	"potion",
	"ring",
	"wondrous",
	"gear",
	"tool",
]);

export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const ITEM_CATEGORIES: readonly ItemCategory[] = ItemCategorySchema.options;

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
	weapon: "Weapon",
	armor: "Armor",
	shield: "Shield",
	ammunition: "Ammunition",
	potion: "Potion",
	ring: "Ring",
	wondrous: "Wondrous Item",
	gear: "Adventuring Gear",
	tool: "Tool",
};

export const EquipmentItemSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	quantity: z.number().int().min(1),
	weight: z.number().min(0),
	equipped: z.boolean(),
	category: ItemCategorySchema.default("gear"),
	description: z.string().default(""),
});

export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;

/**
 * Schema for adding a new item (no id required — generated server-side).
 */
export const AddEquipmentItemSchema = EquipmentItemSchema.omit({ id: true });
export type AddEquipmentItem = z.infer<typeof AddEquipmentItemSchema>;

/**
 * Schema for updating an existing item (all fields optional except id).
 */
export const UpdateEquipmentItemSchema = EquipmentItemSchema.omit({ id: true }).partial();
export type UpdateEquipmentItem = z.infer<typeof UpdateEquipmentItemSchema>;

/**
 * Calculate the total weight of all equipment (weight * quantity per item).
 */
export function calculateTotalWeight(equipment: EquipmentItem[]): number {
	return equipment.reduce((sum, item) => sum + item.weight * item.quantity, 0);
}

/**
 * D&D 5e carrying capacity: STR score * 15.
 */
export function calculateCarryingCapacity(strScore: number): number {
	return strScore * 15;
}

/**
 * Check if a character is encumbered (total weight > carrying capacity).
 */
export function isEncumbered(equipment: EquipmentItem[], strScore: number): boolean {
	return calculateTotalWeight(equipment) > calculateCarryingCapacity(strScore);
}

/**
 * Toggle the equipped status of an item by ID.
 * Returns a new equipment array with the item's equipped state flipped.
 */
export function toggleEquipItem(equipment: EquipmentItem[], itemId: string): EquipmentItem[] {
	return equipment.map((item) =>
		item.id === itemId ? { ...item, equipped: !item.equipped } : item,
	);
}

/**
 * Update an equipment item's properties by ID.
 * Returns a new equipment array with the item updated. Returns original if item not found.
 */
export function updateEquipmentItem(
	equipment: EquipmentItem[],
	itemId: string,
	updates: UpdateEquipmentItem,
): EquipmentItem[] {
	return equipment.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
}
