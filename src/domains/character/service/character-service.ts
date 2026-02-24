/**
 * Character Service — orchestration layer with validation and logging.
 *
 * May import from: types, config, repo, providers
 * Must NOT import from: runtime, ui
 */

import { createLogger } from "../../../providers/telemetry/logger.js";
import { characterRepo } from "../repo/character-repo.js";
import {
	type Character,
	type CreateCharacter,
	CreateCharacterSchema,
	type EquipmentItem,
	EquipmentItemSchema,
	type UpdateCharacter,
	UpdateCharacterSchema,
	applyDamage,
	applyHealing,
} from "../types/index.js";

const log = createLogger("character-service");

export const characterService = {
	async listCharacters(): Promise<Character[]> {
		log.info("Listing all characters");
		const characters = await characterRepo.findAll();
		log.info({ count: characters.length }, "Characters listed");
		return characters;
	},

	async getCharacter(id: string): Promise<Character | null> {
		log.info({ id }, "Getting character");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found");
		}
		return character;
	},

	async getCharacterBySlug(slug: string): Promise<Character | null> {
		log.info({ slug }, "Getting character by slug");
		const character = await characterRepo.findBySlug(slug);
		if (!character) {
			log.info({ slug }, "Character not found by slug");
		}
		return character;
	},

	async createCharacter(input: CreateCharacter): Promise<Character> {
		log.info({ name: input.name }, "Creating character");
		const parsed = CreateCharacterSchema.parse(input);
		const character = await characterRepo.create(parsed);
		log.info({ id: character.id, name: character.name }, "Character created");
		return character;
	},

	async updateCharacter(id: string, input: UpdateCharacter): Promise<Character | null> {
		log.info({ id }, "Updating character");
		const parsed = UpdateCharacterSchema.parse(input);
		const character = await characterRepo.update(id, parsed);
		if (!character) {
			log.info({ id }, "Character not found for update");
		} else {
			log.info({ id }, "Character updated");
		}
		return character;
	},

	async dealDamage(id: string, amount: number): Promise<Character | null> {
		log.info({ id, amount }, "Dealing damage");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for damage");
			return null;
		}
		const newHp = applyDamage(character.hp, amount);
		const updated = await characterRepo.update(id, { hp: newHp });
		log.info({ id, hp: newHp }, "Damage applied");
		return updated;
	},

	async healCharacter(id: string, amount: number): Promise<Character | null> {
		log.info({ id, amount }, "Healing character");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for healing");
			return null;
		}
		const newHp = applyHealing(character.hp, amount);
		const updated = await characterRepo.update(id, { hp: newHp });
		log.info({ id, hp: newHp }, "Healing applied");
		return updated;
	},

	async toggleSkillProficiency(id: string, skillName: string): Promise<Character | null> {
		log.info({ id, skillName }, "Toggling skill proficiency");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for skill toggle");
			return null;
		}
		const skills = character.skills.map((s) =>
			s.name === skillName ? { ...s, proficient: !s.proficient } : s,
		);
		const updated = await characterRepo.update(id, { skills });
		log.info({ id, skillName }, "Skill proficiency toggled");
		return updated;
	},

	async addEquipment(id: string, item: Omit<EquipmentItem, "id">): Promise<Character | null> {
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

	async useSpellSlot(id: string, level: number): Promise<Character | null> {
		log.info({ id, level }, "Using spell slot");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for spell slot use");
			return null;
		}
		const slot = character.spellSlots.find((s) => s.level === level);
		if (!slot || slot.used >= slot.available) {
			throw new Error(`No available spell slots at level ${level}`);
		}
		const spellSlots = character.spellSlots.map((s) =>
			s.level === level ? { ...s, used: s.used + 1 } : s,
		);
		const updated = await characterRepo.update(id, { spellSlots });
		log.info({ id, level }, "Spell slot used");
		return updated;
	},

	async restoreSpellSlot(id: string, level: number): Promise<Character | null> {
		log.info({ id, level }, "Restoring spell slot");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for spell slot restore");
			return null;
		}
		const spellSlots = character.spellSlots.map((s) =>
			s.level === level ? { ...s, used: Math.max(0, s.used - 1) } : s,
		);
		const updated = await characterRepo.update(id, { spellSlots });
		log.info({ id, level }, "Spell slot restored");
		return updated;
	},

	async longRest(id: string): Promise<Character | null> {
		log.info({ id }, "Long rest");
		const character = await characterRepo.findById(id);
		if (!character) {
			log.info({ id }, "Character not found for long rest");
			return null;
		}
		const spellSlots = character.spellSlots.map((s) => ({ ...s, used: 0 }));
		const updated = await characterRepo.update(id, { spellSlots });
		log.info({ id }, "Long rest completed");
		return updated;
	},

	async deleteCharacter(id: string): Promise<boolean> {
		log.info({ id }, "Deleting character");
		const deleted = await characterRepo.delete(id);
		log.info({ id, deleted }, "Character delete result");
		return deleted;
	},
};
