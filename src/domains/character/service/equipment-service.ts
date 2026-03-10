/**
 * Equipment Service — equipment-specific service operations.
 *
 * May import from: types, config, repo, providers
 * Must NOT import from: runtime, ui
 */

import { createLogger } from "../../../providers/telemetry/logger.js";
import { characterRepo } from "../repo/character-repo.js";
import {
	type Character,
	type EquipmentItem,
	EquipmentItemSchema,
	type UpdateEquipmentItem,
	toggleEquipItem,
	updateEquipmentItem,
} from "../types/index.js";

const log = createLogger("equipment-service");

export const equipmentService = {
	async addEquipment(
		id: string,
		item: Omit<EquipmentItem, "id"> | Omit<EquipmentItem, "id" | "category" | "description">,
	): Promise<Character | null> {
		log.info({ id }, "Adding equipment");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for adding equipment");
			return null;
		}
		const newItem = EquipmentItemSchema.parse({
			...item,
			id: crypto.randomUUID(),
		});
		const equipment = [...character.equipment, newItem];
		const updated = await characterRepo.update(id, { equipment });
		log.info({ id, itemName: newItem.name }, "Equipment added");
		return updated;
	},

	async removeEquipment(id: string, itemId: string): Promise<Character | null> {
		log.info({ id, itemId }, "Removing equipment");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for removing equipment");
			return null;
		}
		const equipment = character.equipment.filter((e) => e.id !== itemId);
		const updated = await characterRepo.update(id, { equipment });
		log.info({ id, itemId }, "Equipment removed");
		return updated;
	},

	async toggleEquipItem(id: string, itemId: string): Promise<Character | null> {
		log.info({ id, itemId }, "Toggling equipment equipped state");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for equipment toggle");
			return null;
		}
		const item = character.equipment.find((e) => e.id === itemId);
		if (!item) {
			throw new Error(`Equipment item ${itemId} not found`);
		}
		const equipment = toggleEquipItem(character.equipment, itemId);
		const updated = await characterRepo.update(id, { equipment });
		log.info({ id, itemId, equipped: !item.equipped }, "Equipment toggled");
		return updated;
	},

	async updateEquipmentItem(
		id: string,
		itemId: string,
		updates: UpdateEquipmentItem,
	): Promise<Character | null> {
		log.info({ id, itemId }, "Updating equipment item");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for equipment update");
			return null;
		}
		const item = character.equipment.find((e) => e.id === itemId);
		if (!item) {
			throw new Error(`Equipment item ${itemId} not found`);
		}
		const equipment = updateEquipmentItem(character.equipment, itemId, updates);
		const updated = await characterRepo.update(id, { equipment });
		log.info({ id, itemId }, "Equipment item updated");
		return updated;
	},
};
